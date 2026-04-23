"use server";

import { redirect } from "next/navigation";
import { deleteSession, loginWithPassword, requestAccess } from "@/lib/auth";

export type LoginActionState = {
  error?: string;
};

export type RequestAccessActionState = {
  error?: string;
  success?: string;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Ingresa correo y contrasena para continuar.",
    };
  }

  const result = await loginWithPassword(email, password);

  if (result.status !== "success") {
    if (result.status === "pending-approval") {
      return {
        error: "Tu solicitud aun no ha sido aprobada por un administrador.",
      };
    }

    if (result.status === "rejected") {
      return {
        error: "Tu solicitud fue rechazada. Pide revision a un administrador.",
      };
    }

    if (result.status === "inactive") {
      return {
        error: "Tu cuenta esta inactiva o bloqueada.",
      };
    }

    return {
      error: "Credenciales invalidas o usuario no configurado.",
    };
  }

  redirect("/dashboard");
}

export async function requestAccessAction(
  _previousState: RequestAccessActionState,
  formData: FormData,
): Promise<RequestAccessActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !password || !confirmPassword) {
    return {
      error: "Completa nombre, correo y ambas contrasenas.",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Las contrasenas no coinciden.",
    };
  }

  if (password.length < 8) {
    return {
      error: "La contrasena debe tener al menos 8 caracteres.",
    };
  }

  const result = await requestAccess({
    name,
    email,
    password,
  });

  if (result.status === "email-exists") {
    return {
      error: "Este correo ya existe en el sistema o tiene una solicitud registrada.",
    };
  }

  if (result.status === "error") {
    return {
      error: result.message,
    };
  }

  return {
    success: "Solicitud enviada. Un administrador debe aprobar tu acceso.",
  };
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
