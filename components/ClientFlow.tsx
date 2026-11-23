"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft, Lock } from "lucide-react";
import Avatar from "./Avatar";

type P = { id: string; profile_name: string; avatar_key: string; avatar_url: string | null };
const post = (url: string, body: object) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export default function ClientFlow({ token, label, initialStage, initialProfiles }:
  { token: string; label: string; initialStage: "login" | "choose"; initialProfiles: P[] }) {
  const router = useRouter();
  const [stage, setStage] = useState<"login" | "choose" | "pin">(initialStage);
  const [profiles, setProfiles] = useState<P[]>(initialProfiles);
  const [sel, setSel] = useState<P | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const r = await post(`/api/c/${token}/login`, { name: f.get("name"), password: f.get("password") });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error);
    setProfiles(j.profiles); setStage("choose");
  }
  async function pin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!sel) return; setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const r = await post(`/api/c/${token}/pin`, { profileId: sel.id, pin: f.get("pin") });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error);
    router.push(`/c/${token}/panel`);
  }
  async function exit() { await post(`/api/c/${token}/logout`, {}); setStage("login"); setProfiles([]); setSel(null); }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,6,19,.25),transparent_60%)]" />
      <div className="relative w-full max-w-xl text-center">
        <p className="font-display text-sm tracking-wide text-blood">ITACHI PERÚ · {label}</p>

        {stage === "login" && (
          <form onSubmit={login} className="panel mx-auto mt-6 max-w-md space-y-4 p-7 text-left">
            <h1 className="font-display text-3xl font-extrabold">Iniciar sesión</h1>
            <input name="name" className="field" placeholder="Tu nombre" autoComplete="username" required />
            <input name="password" type="password" className="field" placeholder="Tu contraseña" autoComplete="current-password" required />
            {err && <p role="alert" className="text-sm text-blood-glow">{err}</p>}
            <button className="btn w-full" disabled={busy}><LogIn size={18} />{busy ? "Verificando…" : "Continuar"}</button>
          </form>
        )}

        {stage === "choose" && (
          <div className="mt-6">
            <h1 className="font-display text-4xl font-extrabold">¿Quién va a entrar?</h1>
            <div className="mt-10 flex flex-wrap justify-center gap-8">
              {profiles.map((p) => (
                <button key={p.id} onClick={() => { setSel(p); setErr(""); setStage("pin"); }}
                  className="group flex flex-col items-center gap-3 focus-visible:outline-none">
                  <span className="rounded-md ring-2 ring-transparent transition group-hover:scale-105 group-hover:ring-white group-focus-visible:ring-white">
                    <Avatar k={p.avatar_key} url={p.avatar_url} size={132} />
                  </span>
                  <span className="text-lg text-white/70 group-hover:text-white">{p.profile_name}</span>
                </button>
              ))}
            </div>
            <button onClick={exit} className="btn-ghost mt-12">Salir</button>
          </div>
        )}

        {stage === "pin" && sel && (
          <form onSubmit={pin} className="mx-auto mt-6 max-w-sm space-y-5">
            <div className="mx-auto w-fit"><Avatar k={sel.avatar_key} url={sel.avatar_url} size={110} /></div>
            <h1 className="font-display text-3xl font-extrabold">{sel.profile_name}</h1>
            <p className="flex items-center justify-center gap-2 text-white/70"><Lock size={16} />Ingresa el PIN de tu perfil</p>
            <input name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoFocus required
              className="field text-center text-3xl tracking-[.6em]" aria-label="PIN de 4 dígitos" />
            {err && <p role="alert" className="text-sm text-blood-glow">{err}</p>}
            <button className="btn w-full" disabled={busy}>{busy ? "Verificando…" : "Entrar"}</button>
            <button type="button" onClick={() => { setStage("choose"); setErr(""); }} className="btn-ghost w-full">
              <ArrowLeft size={16} />Cambiar de perfil
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
