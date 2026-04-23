import type { Metadata } from "next";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Panel | Compromisos",
  description: "Punto de entrada inicial para la plataforma de compromisos.",
};

export const dynamic = "force-dynamic";

const roleLabels = {
  [UserRole.ADMIN]: "Administrador",
  [UserRole.VIEWER]: "Visualizador",
};

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <AppShell
      user={user}
      pathname="/dashboard"
      title={`Bienvenido, ${user.name}`}
      description={`Perfil activo: ${roleLabels[user.role]}. Esta pantalla queda intencionalmente en blanco para que empecemos a construir la logica de negocio de compromisos.`}
      actions={
        user.role === UserRole.ADMIN ? (
          <Link
            href="/admin/users"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium leading-none text-white transition hover:bg-white/10"
          >
            Administrar usuarios
          </Link>
        ) : null
      }
    >
      <section className="flex min-h-[calc(100vh-13rem)] items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <div className="max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-700">
            Punto de partida
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">
            Pagina en blanco lista para construir.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Ya puedes entrar a la plataforma, validar accesos y comenzar a montar
            aqui la logica propia del negocio.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
