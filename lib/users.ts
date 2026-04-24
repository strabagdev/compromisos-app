import "server-only";

import { randomUUID } from "node:crypto";
import { UserApprovalStatus, UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findSupabaseAuthUserIdByEmail(email: string) {
  const supabase = createSupabaseServiceClient();
  const normalizedEmail = normalizeEmail(email);

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      return {
        status: "error" as const,
        message: "No se pudo consultar la cuenta en Supabase.",
      };
    }

    const matched = data.users.find(
      (candidate) => normalizeEmail(candidate.email ?? "") === normalizedEmail,
    );

    if (matched) {
      return {
        status: "success" as const,
        authUserId: matched.id,
      };
    }

    if (data.users.length < 200) {
      return {
        status: "success" as const,
        authUserId: null,
      };
    }
  }

  return {
    status: "success" as const,
    authUserId: null,
  };
}

export async function listUsersForAdmin() {
  const prisma = getPrisma();

  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function deleteUserFromPlatform(userId: string, currentUserId: string) {
  if (userId === currentUserId) {
    return {
      status: "error" as const,
      message: "No puedes eliminar tu propio acceso desde esta pantalla.",
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    return {
      status: "error" as const,
      message: "Usuario no encontrado.",
    };
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return {
    status: "success" as const,
  };
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
  const data: {
    active?: boolean;
    role?: UserRole;
    approvalStatus?: UserApprovalStatus;
    authUserId?: string;
  } = {};

  if (input.approvalStatus === UserApprovalStatus.APPROVED) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        authUserId: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return {
        status: "error" as const,
        message: "Usuario no encontrado.",
      };
    }

    if (!user.authUserId) {
      const matched = await findSupabaseAuthUserIdByEmail(user.email);

      if (matched.status === "error") {
        return matched;
      }

      if (matched.authUserId) {
        data.authUserId = matched.authUserId;
      } else {
        if (!input.password) {
          return {
            status: "error" as const,
            message: "Ingresa una contrasena temporal para crear la cuenta en Supabase.",
          };
        }

        if (input.password.length < 8) {
          return {
            status: "error" as const,
            message: "La contrasena temporal debe tener al menos 8 caracteres.",
          };
        }

        const supabase = createSupabaseServiceClient();
        const { data: createdAuthUser, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: input.password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
          },
        });

        if (error || !createdAuthUser.user) {
          return {
            status: "error" as const,
            message: "No se pudo crear la cuenta en Supabase.",
          };
        }

        data.authUserId = createdAuthUser.user.id;
      }
    }
  }

  if (typeof input.active === "boolean") {
    data.active = input.active;
  }

  if (input.role) {
    data.role = input.role;
  }

  if (input.approvalStatus) {
    data.approvalStatus = input.approvalStatus;
  }

  if (
    typeof data.active === "boolean" ||
    data.role ||
    data.approvalStatus ||
    data.authUserId
  ) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });
  }

  if (input.password && input.approvalStatus !== UserApprovalStatus.APPROVED) {
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
