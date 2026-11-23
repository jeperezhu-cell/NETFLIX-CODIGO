import AdminLogin from "@/components/AdminLogin";
import { Link2, ShieldCheck, Bell, KeyRound } from "lucide-react";

const FEATURES = [
  { Icon: Link2, t: "Un link por cuenta", d: "Cada cuenta tiene su acceso propio. Entra desde el link que te dio la administración." },
  { Icon: KeyRound, t: "Tu perfil, tu PIN", d: "Inicias sesión, eliges tu perfil y confirmas tu PIN de 4 dígitos." },
  { Icon: ShieldCheck, t: "Códigos al instante", d: "Código de inicio de sesión, hogar y verificación disponibles con un toque." },
  { Icon: Bell, t: "Avisos en tu celular", d: "Recordatorios de pago antes de que venza tu suscripción." }
];

export default function Home() {
  return (
    <main>
      <section className="relative mx-auto max-w-7xl px-3 pt-3 md:px-6 md:pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-blood/30 bg-black shadow-glow">
          {/* Portada oficial: reemplaza public/image.png para cambiarla */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/image.png" alt="ITACHI PERÚ" className="mx-auto block h-auto max-h-[78vh] w-full object-contain" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/90 to-transparent" />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-8">
          <div>
            <p className="chip bg-blood/15 text-blood-glow">うちは一族 · PLATAFORMA PRIVADA</p>
            <h1 className="title mt-4 text-4xl leading-tight md:text-6xl">ITACHI PERÚ <span className="text-blood">CONTROL</span></h1>
            <p className="mt-4 max-w-prose text-lg text-white/70">Administra tu cuenta, tu perfil y tu suscripción en un solo lugar. Si eres cliente, usa el link personal que te envió la administración.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ Icon, t, d }) => (
              <div key={t} className="panel p-5 transition hover:-translate-y-1 hover:border-blood/40">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blood/15 text-blood"><Icon size={22} /></span>
                <h3 className="mt-3 font-semibold">{t}</h3><p className="mt-1 text-sm text-white/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:pt-6"><AdminLogin /></div>
      </section>
    </main>
  );
}
