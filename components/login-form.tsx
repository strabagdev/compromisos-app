"use client";

import { useActionState, useState } from "react";
import {
  loginAction,
  requestAccessAction,
  type LoginActionState,
  type RequestAccessActionState,
} from "@/app/actions/auth";

const initialState: LoginActionState = {};
const initialRequestState: RequestAccessActionState = {};
type LoginFormTab = "login" | "request";

export function LoginForm() {
  const [activeTab, setActiveTab] = useState<LoginFormTab>("login");
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [requestState, requestFormAction, requestPending] = useActionState(
    requestAccessAction,
    initialRequestState,
  );

  return (
    <div className="space-y-6">
      <div
        className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1"
        role="tablist"
        aria-label="Modo de acceso"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "login"}
          onClick={() => setActiveTab("login")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "login"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Ingresar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "request"}
          onClick={() => setActiveTab("request")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "request"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Solicitar acceso
        </button>
      </div>

      {activeTab === "login" ? (
        <form action={formAction} className="space-y-5">
          <Field
            id="email"
            label="Correo"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@empresa.cl"
          />
          <Field
            id="password"
            label="Contrasena"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Tu contrasena"
          />

          {state.error ? (
            <p
              aria-live="polite"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-[#0369a1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#075985] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600">
            Registra tu solicitud. Si ya tienes cuenta en otra plataforma,
            usaras tu contrasena actual cuando un administrador apruebe el acceso.
          </p>

          <form action={requestFormAction} className="space-y-5">
            <Field
              id="request-name"
              label="Nombre"
              name="name"
              autoComplete="name"
              placeholder="Nombre completo"
            />
            <Field
              id="request-email"
              label="Correo"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@empresa.cl"
            />

            {requestState.error ? (
              <p
                aria-live="polite"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {requestState.error}
              </p>
            ) : null}

            {requestState.success ? (
              <p
                aria-live="polite"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {requestState.success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={requestPending}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {requestPending ? "Enviando solicitud..." : "Solicitar acceso"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field(props: {
  id: string;
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        name={props.name}
        type={props.type ?? "text"}
        required
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0369a1] focus:ring-4 focus:ring-[#bfdbfe]"
      />
    </div>
  );
}
