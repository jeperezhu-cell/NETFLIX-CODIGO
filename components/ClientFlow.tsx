"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft, Lock, LogOut } from "lucide-react";
import Avatar from "./Avatar";
import Sharingan from "./Sharingan";

type P = { id: string; profile_name: string; avatar_key: string; avatar_url: string | null };
const post = (url: string, body: object) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export default function ClientFlow({ token, label, initialStage, initialProfiles }:
  { token: string; label: string; initialStage: "login" | "choose"; initialProfiles: P[] }) {
  const router = useRouter();
  const [stage, setStage] = useState<"login" | "choose" | "pin">(initialStage);
  const [profiles, setProfiles] = useState<P[]>(initialProfiles);
  const [sel, setSel] = useState<P | null>(null);
  const [pin, setPin] = useState(""); const [shake, setShake] = useState(false);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const r = await post(`/api/c/${token}/login`, { name: f.get("name"), password: f.get("password") });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error);
    setProfiles(j.profiles); setStage("choose");
  }
  async function verify(code: string) {
    if (!sel) return; setBusy(true); setErr("");
    const r = await post(`/api/c/${token}/pin`, { profileId: sel.id, pin: code });
    if (!r.ok) {
      const j = await r.json(); setBusy(false); setErr(j.error); setPin(""); setShake(true); setTimeout(() => setShake(false), 450); ref.current?.focus(); return;
    }
    router.push(`/c/${token}/panel`);
  }
  async function exit() { await post(`/api/c/${token}/logout`, {}); setStage("login"); setProfiles([]); setSel(null); }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs tracking-widest text-white/70">
          <Sharingan className="h-4 w-4 animate-spin-slow" />ITACHI PERÚ · {label}
        </div>

        {stage === "login" && (
          <form onSubmit={login} className="panel animate-pop-in mx-auto mt-6 max-w-md space-y-4 p-8 text-left">
            <Sharingan className="mx-auto h-20 w-20 animate-spin-slow drop-shadow-[0_0_24px_rgba(225,6,19,.6)]" />
            <h1 className="title text-center text-3xl">Iniciar sesión</h1>
            <input name="name" className="field" placeholder="Tu nombre" autoComplete="username" required />
            <input name="password" type="password" className="field" placeholder="Tu contraseña" autoComplete="current-password" required />
            {err && <p role="alert" className="rounded-lg bg-blood/15 px-3 py-2 text-sm text-blood-glow">{err}</p>}
            <button className="btn w-full" disabled={busy}><LogIn size={18} />{busy ? "Verificando…" : "Continuar"}</button>
          </form>
        )}

        {stage === "choose" && (
          <div className="animate-pop-in mt-8">
            <h1 className="title text-4xl md:text-5xl">¿Quién va a entrar?</h1>
            <div className="mt-12 flex flex-wrap justify-center gap-10">
              {profiles.map((p) => (
                <button key={p.id} onClick={() => { setSel(p); setErr(""); setPin(""); setStage("pin"); }} className="group flex flex-col items-center gap-4 focus-visible:outline-none">
                  <span className="rounded-xl ring-4 ring-transparent transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-glow group-hover:ring-white group-focus-visible:ring-white">
                    <Avatar k={p.avatar_key} url={p.avatar_url} size={140} />
                  </span>
                  <span className="text-xl text-white/60 transition group-hover:text-white">{p.profile_name}</span>
                </button>
              ))}
            </div>
            <button onClick={exit} className="btn-ghost mt-14"><LogOut size={16} />Salir</button>
          </div>
        )}

        {stage === "pin" && sel && (
          <div className="animate-pop-in mx-auto mt-8 max-w-sm space-y-6">
            <div className="mx-auto w-fit rounded-xl shadow-glow"><Avatar k={sel.avatar_key} url={sel.avatar_url} size={112} /></div>
            <h1 className="title text-3xl">{sel.profile_name}</h1>
            <p className="flex items-center justify-center gap-2 text-white/65"><Lock size={16} />Ingresa el PIN de tu perfil</p>
            <label className={`relative mx-auto block w-fit ${shake ? "animate-shake" : ""}`} onClick={() => ref.current?.focus()}>
              <span className="flex gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`grid h-16 w-14 place-items-center rounded-xl border-2 text-3xl transition ${pin.length === i ? "border-blood shadow-glow" : "border-white/15"} bg-black/50`}>
                    {pin[i] ? "●" : ""}
                  </span>
                ))}
              </span>
              <input ref={ref} autoFocus type="password" inputMode="numeric" maxLength={4} value={pin} disabled={busy} aria-label="PIN de 4 dígitos"
                onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setPin(v); if (v.length === 4) verify(v); }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
            {err && <p role="alert" className="rounded-lg bg-blood/15 px-3 py-2 text-sm text-blood-glow">{err}</p>}
            {busy && <p className="text-sm text-white/60">Verificando…</p>}
            <button type="button" onClick={() => { setStage("choose"); setErr(""); }} className="btn-ghost"><ArrowLeft size={16} />Cambiar de perfil</button>
          </div>
        )}
      </div>
    </main>
  );
}
