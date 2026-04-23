import "server-only";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { UserApprovalStatus, UserRole, type User as DbUser } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type LoginAttemptResult =
  | { status: "success"; user: AuthUser }
  | { status: "invalid-credentials" }
  | { status: "pending-approval" }
  | { status: "rejected" }
  | { status: "inactive" };

type RequestAccessResult =
  | { status: "success" }
  | { status: "email-exists" }
  | { status: "error"; message: string };

type AuthSeedUser = {
  email: string;
  name: string;
  role: UserRole;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getSeedUsers(): AuthSeedUser[] {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  const adminName = process.env.ADMIN_NAME?.trim() || "Administrador";

  if (!adminEmail) {
    return [];
  }

  return [
    {
      email: adminEmail,
      name: adminName,
      role: UserRole.ADMIN,
    },
  ];
}

async function ensureBaseUsers() {
  const prisma = getPrisma();
  const count = await prisma.user.count();

  if (count > 0) {
    return;
  }

  const seedUsers = getSeedUsers();

  if (seedUsers.length === 0) {
    return;
  }

  await prisma.user.createMany({
    data: seedUsers.map((user) => ({
      email: user.email,
      name: user.name,
      passwordHash: hashPassword(randomUUID()),
      role: user.role,
      approvalStatus: UserApprovalStatus.APPROVED,
      active: true,
    })),
  });
}

function toAuthUser(user: Pick<DbUser, "id" | "name" | "email" | "role">): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function syncInternalUser(authUser: { id: string; email?: string | null; user_metadata?: unknown }) {
  await ensureBaseUsers();
  const prisma = getPrisma();
  const email = normalizeEmail(authUser.email ?? "");

  if (!email) {
    return { status: "inactive" as const };
  }

  const metadata =
    authUser.user_metadata && typeof authUser.user_metadata === "object"
      ? authUser.user_metadata
      : null;
  const metadataName =
    metadata &&
    "name" in metadata &&
    typeof metadata.name === "string" &&
    metadata.name.trim()
      ? metadata.name.trim()
      : email.split("@")[0];

  const bootstrapAdminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ authUserId: authUser.id }, { email }],
    },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          authUserId: existingUser.authUserId ?? authUser.id,
          email,
          name: existingUser.name || metadataName,
          role:
            existingUser.role === UserRole.ADMIN || bootstrapAdminEmail !== email
              ? existingUser.role
              : UserRole.ADMIN,
          approvalStatus:
            existingUser.approvalStatus === UserApprovalStatus.REJECTED
              ? UserApprovalStatus.REJECTED
              : bootstrapAdminEmail === email
                ? UserApprovalStatus.APPROVED
                : existingUser.approvalStatus,
        },
      })
    : await prisma.user.create({
        data: {
          authUserId: authUser.id,
          email,
          name: metadataName,
          passwordHash: hashPassword(randomUUID()),
          role: bootstrapAdminEmail === email ? UserRole.ADMIN : UserRole.VIEWER,
          approvalStatus:
            bootstrapAdminEmail === email
              ? UserApprovalStatus.APPROVED
              : UserApprovalStatus.PENDING,
          active: true,
        },
      });

  if (!user.active) {
    return { status: "inactive" as const };
  }

  if (user.approvalStatus === UserApprovalStatus.PENDING) {
    return { status: "pending" as const };
  }

  if (user.approvalStatus === UserApprovalStatus.REJECTED) {
    return { status: "rejected" as const };
  }

  return {
    status: "approved" as const,
    user: toAuthUser(user),
  };
}

export async function deleteSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginAttemptResult> {
  const supabase = await createSupabaseServerClient();
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) {
    return { status: "invalid-credentials" };
  }

  const syncResult = await syncInternalUser(data.user);

  if (syncResult.status !== "approved") {
    await supabase.auth.signOut();

    if (syncResult.status === "pending") {
      return { status: "pending-approval" };
    }

    if (syncResult.status === "rejected") {
      return { status: "rejected" };
    }

    return { status: "inactive" };
  }

  return { status: "success", user: syncResult.user };
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const syncResult = await syncInternalUser(user);

  if (syncResult.status !== "approved") {
    await supabase.auth.signOut();
    return null;
  }

  return syncResult.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return user;
}

export async function requestAccess(input: {
  name: string;
  email: string;
  password: string;
}): Promise<RequestAccessResult> {
  const prisma = getPrisma();
  const supabase = createSupabaseServiceClient();
  const email = normalizeEmail(input.email);
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return {
      status: "email-exists",
    };
  }

  let createdAuthUserId: string | null = null;

  try {
    const { data: createdAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        name: input.name.trim(),
      },
    });

    if (authError || !createdAuthUser.user) {
      return {
        status: "error",
        message: "No se pudo crear la cuenta en Supabase. Revisa si el correo ya existe.",
      };
    }

    createdAuthUserId = createdAuthUser.user.id;

    await prisma.user.create({
      data: {
        authUserId: createdAuthUserId,
        name: input.name.trim(),
        email,
        passwordHash: hashPassword(randomUUID()),
        role: UserRole.VIEWER,
        approvalStatus: UserApprovalStatus.PENDING,
        active: true,
      },
    });

    return {
      status: "success",
    };
  } catch {
    if (createdAuthUserId) {
      await supabase.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    }

    return {
      status: "error",
      message: "No se pudo registrar la solicitud. Revisa si el correo ya existe.",
    };
  }
}
