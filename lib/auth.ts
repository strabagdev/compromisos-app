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

  const user =
    existingUser ??
    (bootstrapAdminEmail === email
      ? await prisma.user.create({
          data: {
            authUserId: authUser.id,
            email,
            name: metadataName,
            passwordHash: hashPassword(randomUUID()),
            role: UserRole.ADMIN,
            approvalStatus: UserApprovalStatus.APPROVED,
            active: true,
          },
        })
      : null);

  if (!user) {
    return { status: "inactive" as const };
  }

  const syncedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      authUserId: user.authUserId ?? authUser.id,
      email,
      name: user.name || metadataName,
      role:
        user.role === UserRole.ADMIN || bootstrapAdminEmail !== email
          ? user.role
          : UserRole.ADMIN,
      approvalStatus:
        user.approvalStatus === UserApprovalStatus.REJECTED
          ? UserApprovalStatus.REJECTED
          : bootstrapAdminEmail === email
            ? UserApprovalStatus.APPROVED
            : user.approvalStatus,
    },
  });

  if (!syncedUser.active) {
    return { status: "inactive" as const };
  }

  if (syncedUser.approvalStatus === UserApprovalStatus.PENDING) {
    return { status: "pending" as const };
  }

  if (syncedUser.approvalStatus === UserApprovalStatus.REJECTED) {
    return { status: "rejected" as const };
  }

  return {
    status: "approved" as const,
    user: toAuthUser(syncedUser),
  };
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
      return null;
    }

    const matched = data.users.find(
      (candidate) => normalizeEmail(candidate.email ?? "") === normalizedEmail,
    );

    if (matched) {
      return matched.id;
    }

    if (data.users.length < 200) {
      return null;
    }
  }

  return null;
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
}): Promise<RequestAccessResult> {
  const prisma = getPrisma();
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

  const authUserId = await findSupabaseAuthUserIdByEmail(email);

  try {
    await prisma.user.create({
      data: {
        authUserId,
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
    return {
      status: "error",
      message: "No se pudo registrar la solicitud. Revisa si el correo ya existe.",
    };
  }
}
