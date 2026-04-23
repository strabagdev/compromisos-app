import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Compromisos",
  description: "Base inicial de acceso para la plataforma de compromisos.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f7f4] text-slate-950">
      <section className="relative isolate px-6 py-8 md:px-10">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,#bfdbfe,transparent_28%),radial-gradient(circle_at_top_right,#99f6e4,transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f4f7f4_100%)]" />

        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/80 px-5 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur">
          <div>
            <p className="text-sm font-semibold tracking-[0.25em] text-slate-950">
              COMPROMISOS
            </p>
            <p className="text-xs text-slate-500">Base de acceso y administracion</p>
          </div>

          <Link
            href="/login"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Ingresar
          </Link>
        </div>

        <div className="mx-auto mt-10 grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2.5rem] border border-white/70 bg-white/75 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-12">
            <span className="inline-flex rounded-full bg-sky-100 px-4 py-1 text-sm font-medium text-sky-900">
              Cascaron listo para construir
            </span>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
              Accede a la plataforma y aterriza en un lienzo en blanco.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Replicamos la capa transversal del proyecto de oficina tecnica:
              autenticacion, solicitud de acceso, administracion de usuarios y
              proteccion de rutas, dejando fuera la logica de negocio propia de
              compromisos.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="rounded-full bg-[#0369a1] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#075985]"
              >
                Entrar al sistema
              </Link>
              <a
                href="#alcance"
                className="rounded-full border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              >
                Ver alcance base
              </a>
            </div>
          </div>

          <div className="grid gap-5">
            <article className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
              <p className="text-sm uppercase tracking-[0.3em] text-sky-200">
                Incluido en esta replica
              </p>
              <ul className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
                <li>Ingreso por Supabase Auth con sesion persistente.</li>
                <li>Solicitud de acceso para nuevos usuarios.</li>
                <li>Panel de administracion para aprobar, crear y bloquear cuentas.</li>
                <li>Dashboard inicial vacio para empezar la logica del negocio.</li>
              </ul>
            </article>

            <article
              id="alcance"
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <InfoCard
                  title="Autenticacion"
                  description="Login y sesion segura sobre Supabase Auth."
                />
                <InfoCard
                  title="Accesos"
                  description="Solicitud, aprobacion y estado activo o bloqueado."
                />
                <InfoCard
                  title="Administracion"
                  description="Creacion de usuarios y gestion basica de roles."
                />
                <InfoCard
                  title="Destino inicial"
                  description="Una pagina en blanco protegida para empezar a construir."
                />
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}
