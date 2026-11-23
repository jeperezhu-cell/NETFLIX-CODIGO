import AdminLogin from "@/components/AdminLogin";
import { Link2, ShieldCheck, Bell } from "lucide-react";

export default function Home() {
  return (
    <main>
      <section className="relative w-full overflow-hidden bg-black hero-sweep">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(225,6,19,.28),transparent_65%)]" />
        {/* Portada oficial: reemplaza public/image.png para cambiarla */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/image.png" alt="ITACHI PERÚ" className="relative mx-auto block h-auto max-h-[78vh] w-full object-contain" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <h1 className="font-display text-4xl font-extrabold leading-tight md:text-5xl">
            ITACHI PERÚ <span className="text-blood">CONTROL</span>
          </h1>
          <p className="max-w-prose text-lg text-white/75">
            Tu cuenta, tu perfil y tu suscripción en un solo lugar. Si eres cliente, entra con el link
            personal que te envió la administración: ahí iniciarás sesión, elegirás tu perfil y
            confirmarás tu PIN.
          </p>
          <ul className="space-y-3 text-white/80">
            <li className="flex gap-3"><Link2 className="mt-0.5 text-blood" size={20} />Un link distinto para cada cuenta.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 text-blood" size={20} />Perfil protegido con PIN de 4 dígitos.</li>
            <li className="flex gap-3"><Bell className="mt-0.5 text-blood" size={20} />Recordatorios de pago antes del vencimiento.</li>
          </ul>
        </div>
        <AdminLogin />
      </section>
    </main>
  );
}
