import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ingreso | Plantilla de Acceso",
  description: "Acceso a la aplicacion base.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] px-6 py-10 text-slate-900">
      <div className="absolute left-[-6rem] top-[-4rem] h-64 w-64 rounded-full bg-sky-200/60 blur-3xl" />
      <div className="absolute bottom-[-5rem] right-[-4rem] h-72 w-72 rounded-full bg-cyan-200/60 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,#bfdbfe,transparent_52%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <div className="space-y-8">
            <span className="inline-flex rounded-full bg-slate-900 px-4 py-1 text-sm font-medium text-white">
              Plantilla de Acceso
            </span>
            <div className="space-y-5">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Base lista para tu aplicacion
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600">
                Ingresa con tu cuenta o solicita acceso para comenzar.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard title="Ingreso" description="Acceso con Supabase Auth." />
            <InfoCard title="Solicitud" description="Alta con aprobacion interna." />
            <InfoCard title="Base" description="Lista para adaptar a tu producto." />
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-8 space-y-2">
              <h2 className="text-2xl font-semibold text-slate-950">Ingresar</h2>
              <p className="text-sm leading-6 text-slate-600">
                Usa tu cuenta o solicita acceso.
              </p>
            </div>

            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-700">{description}</p>
    </article>
  );
}
