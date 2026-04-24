"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserApprovalStatus, UserRole } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import {
  createUser,
  deleteUserFromPlatform,
  listUsersForAdmin,
  updateUserAdminState,
} from "@/lib/users";

function redirectWithMessage(type: "success" | "error", message: string): never {
  const params = new URLSearchParams({
    type,
    message,
  });

  redirect(`/admin/users?${params.toString()}`);
}

export async function manageUserAction(formData: FormData) {
  const currentUser = await requireAdmin();

  const action = String(formData.get("action") ?? "").trim();

  if (action === "create") {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? UserRole.VIEWER);

    if (!name || !email || !password) {
      redirectWithMessage("error", "Completa nombre, correo y contrasena del usuario.");
    }

    const result = await createUser({
      name,
      email,
      password,
      role: role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.VIEWER,
      approvalStatus: UserApprovalStatus.APPROVED,
    });

    if (result.status === "error") {
      redirectWithMessage("error", result.message);
    }

    revalidatePath("/admin/users");
    redirectWithMessage("success", "Usuario creado correctamente.");
  }

  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirectWithMessage("error", "Usuario no valido para la operacion.");
  }

  if (action === "toggle-active") {
    const active = String(formData.get("active") ?? "false") === "true";
    await updateUserAdminState(userId, { active });
    revalidatePath("/admin/users");
    redirectWithMessage("success", active ? "Usuario activado." : "Usuario desactivado.");
  }

  if (action === "update-role") {
    const role = String(formData.get("role") ?? UserRole.VIEWER);
    await updateUserAdminState(userId, {
      role: role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.VIEWER,
    });
    revalidatePath("/admin/users");
    redirectWithMessage("success", "Rol actualizado.");
  }

  if (action === "update-approval-status") {
    const approvalStatus = String(
      formData.get("approvalStatus") ?? UserApprovalStatus.PENDING,
    );
    const temporaryPassword = String(formData.get("temporaryPassword") ?? "");
    const resolvedStatus =
      approvalStatus === UserApprovalStatus.APPROVED ||
      approvalStatus === UserApprovalStatus.REJECTED
        ? approvalStatus
        : UserApprovalStatus.PENDING;

    const result = await updateUserAdminState(userId, {
      approvalStatus: resolvedStatus,
      ...(temporaryPassword ? { password: temporaryPassword } : {}),
    });

    if (result?.status === "error") {
      redirectWithMessage("error", result.message);
    }

    revalidatePath("/admin/users");
    redirectWithMessage("success", "Estado de solicitud actualizado.");
  }

  if (action === "reset-password") {
    const password = String(formData.get("password") ?? "");

    if (!password) {
      redirectWithMessage("error", "Ingresa una nueva contrasena.");
    }

    const users = await listUsersForAdmin();
    const target = users.find((user) => user.id === userId);

    if (!target) {
      redirectWithMessage("error", "Usuario no encontrado.");
    }

    const result = await updateUserAdminState(userId, {
      password,
      email: target.email,
    });

    if (result?.status === "error") {
      redirectWithMessage("error", result.message);
    }

    revalidatePath("/admin/users");
    redirectWithMessage("success", "Clave actualizada en Supabase.");
  }

  if (action === "delete-platform-user") {
    const result = await deleteUserFromPlatform(userId, currentUser.id);

    if (result.status === "error") {
      redirectWithMessage("error", result.message);
    }

    revalidatePath("/admin/users");
    redirectWithMessage("success", "Usuario eliminado de esta plataforma.");
  }

  redirectWithMessage("error", "Accion no soportada.");
}
