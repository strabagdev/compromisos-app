import "server-only";

import { randomUUID } from "node:crypto";
import { UserApprovalStatus, UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listUsersForAdmin() {
  const prisma = getPrisma();

  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  approvalStatus: UserApprovalStatus;
}) {
  const prisma = getPrisma();
  const supabase = createSupabaseServiceClient();
  const email = normalizeEmail(input.email);

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      status: "error" as const,
      message: "El correo ya existe en el sistema.",
    };
  }

  let createdAuthUserId: string | null = null;

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        name: input.name.trim(),
      },
    });

    if (error || !data.user) {
      return {
        status: "error" as const,
        message: "No se pudo crear el usuario en Supabase. Revisa si el correo ya existe.",
      };
    }

    createdAuthUserId = data.user.id;

    await prisma.user.create({
      data: {
        authUserId: createdAuthUserId,
        name: input.name.trim(),
        email,
        passwordHash: hashPassword(randomUUID()),
        role: input.role,
        approvalStatus: input.approvalStatus,
        active: true,
      },
    });

    return {
      status: "success" as const,
    };
  } catch {
    if (createdAuthUserId) {
      await supabase.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    }

    return {
      status: "error" as const,
      message: "No se pudo crear el usuario interno.",
    };
  }
}

export async function updateUserAdminState(
  userId: string,
  input: {
    active?: boolean;
    role?: UserRole;
    approvalStatus?: UserApprovalStatus;
    password?: string;
    email?: string;
  },
) {
  const prisma = getPrisma();

  if (typeof input.active === "boolean" || input.role || input.approvalStatus) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(typeof input.active === "boolean" ? { active: input.active } : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(input.approvalStatus ? { approvalStatus: input.approvalStatus } : {}),
      },
    });
  }

  if (input.password) {
    const supabase = createSupabaseServiceClient();
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        authUserId: true,
        email: true,
      },
    });

    if (!user) {
      return {
        status: "error" as const,
        message: "Usuario no encontrado.",
      };
    }

    let authUserId = user.authUserId;

    if (!authUserId) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });

      if (error) {
        return {
          status: "error" as const,
          message: "No se pudo consultar la cuenta en Supabase.",
        };
      }

      const matched = data.users.find(
        (candidate) =>
          normalizeEmail(candidate.email ?? "") === normalizeEmail(input.email ?? user.email),
      );

      authUserId = matched?.id ?? null;

      if (authUserId) {
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            authUserId,
          },
        });
      }
    }

    if (!authUserId) {
      return {
        status: "error" as const,
        message: "No se encontro la cuenta del usuario en Supabase.",
      };
    }

    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      password: input.password,
      email_confirm: true,
    });

    if (error) {
      return {
        status: "error" as const,
        message: "No se pudo actualizar la clave en Supabase.",
      };
    }
  }

  return {
    status: "success" as const,
  };
}
