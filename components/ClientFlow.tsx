"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft, Lock, LogOut, Plus, Ban } from "lucide-react";
import Avatar from "./Avatar";
import Sharingan from "./Sharingan";

type P = { id: string; profile_name: string; avatar_key: string; avatar_url: string | null; status?: string };
const post = (url: string, body: object) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export default function ClientFlow({ token, label, initialStage, initialProfiles, maxProfiles = 5 }:
  { token: string; label: string; initialStage: "login" | "choose"; initialProfiles: P[]; maxProfiles?: number }) {
  const router = useRouter();
  const [stage, setStage] = useState<"login" | "choose" | "pin">(initialStage);
  const [profiles, setProfiles] = useState<P[]>(initialProfiles);
  const [max, setMax] = useState(maxProfiles);
  const [sel, setSel] = useState<P | null>(null);
  const [pin, setPin] = useState(""); const [shake, setShake] = useState(false);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const f = new FormData(e.currentTarget);
      const r = await post(`/api/c/${token}/login`, { name: f.get("name"), password: f.get("password") });
      const j = await r.json();
      if (!r.ok) return setErr(j.error);
      setProfiles(j.profiles); setMax(j.maxProfiles ?? 5); setStage("choose");
    } catch { setErr("Sin conexión. Intenta de nuevo."); } finally { setBusy(false); }
  }
  async function verify(code: string) {
    if (!sel) return; setBusy(true); setErr("");
    try {
      const r = await post(`/api/c/${token}/pin`, { profileId: sel.id, pin: code });
      if (!r.ok) {
        const j = await r.json(); setErr(j.error); setPin(""); setShake(true); setTimeout(() => setShake(false), 450); ref.current?.focus(); return;
      }
      router.push(`/c/${token}/panel`);
    } catch { setErr("Sin conexión. Intenta de nuevo."); } finally { setBusy(false); }
  }
  async function exit() { await post(`/api/c/${token}/logout`, {}); setStage("login"); setProfiles([]); setSel(null); }
  const free = Math.max(0, max - profiles.length);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-4 pb-12 pt-4 md:pt-6">
      {/* Portada oficial (public/image.png) */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-blood/30 bg-black shadow-glow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/image.png" alt="ITACHI PERÚ" className="mx-auto block h-auto max-h-[42vh] w-full object-cover object-center md:max-h-[52vh]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-1.5 text-xs font-semibold tracking-widest text-white/80 backdrop-blur">
          <Sharingan className="h-4 w-4 animate-spin-slow" />ITACHI PERÚ · {label}
        </div>
      </div>

      <div className="w-full max-w-3xl text-center">
        {stage === "login" && (
          <form onSubmit={login} className="panel animate-pop-in mx-auto mt-8 max-w-md space-y-4 p-8 text-left">
            <h1 className="title text-center text-3xl">Iniciar sesión</h1>
            <p className="text-center text-sm text-white/55">Escribe los datos que te dio la administración.</p>
            <input name="name" className="field" placeholder="Tu nombre" autoComplete="username" required />
            <input name="password" type="password" className="field" placeholder="Tu contraseña" autoComplete="current-password" required />
            {err && <p role="alert" className="rounded-lg bg-blood/15 px-3 py-2 text-sm text-blood-glow">{err}</p>}
            <button className="btn w-full !py-3.5" disabled={busy}><LogIn size={18} />{busy ? "Verificando…" : "Continuar"}</button>
          </form>
        )}

        {stage === "choose" && (
          <div className="animate-pop-in mt-8">
            <h1 className="title text-4xl md:text-5xl">¿Quién va a entrar?</h1>
            <p className="mt-2 text-sm text-white/50">Elige tu perfil e ingresa tu PIN</p>
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
              {profiles.map((p) => (
                <button key={p.id} onClick={() => { setSel(p); setErr(""); setPin(""); setStage("pin"); }} className="group flex flex-col items-center gap-3 focus-visible:outline-none">
                  <span className="relative rounded-xl ring-4 ring-transparent transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-glow group-hover:ring-white group-focus-visible:ring-white">
                    <Avatar k={p.avatar_key} url={p.avatar_url} size={112} />
                    {p.status === "suspended" && <span className="absolute inset-0 grid place-items-center rounded-md bg-black/65"><Ban size={30} className="text-blood-glow" /></span>}
                  </span>
                  <span className="max-w-full truncate text-lg text-white/65 transition group-hover:text-white">{p.profile_name}</span>
                </button>
              ))}
              {Array.from({ length: free }).map((_, i) => (
                <div key={`free-${i}`} className="flex flex-col items-center gap-3 opacity-40" aria-label="Perfil disponible">
                  <span className="grid h-28 w-28 place-items-center rounded-xl border-2 border-dashed border-white/25 text-white/50"><Plus size={34} /></span>
                  <span className="text-lg text-white/50">+{i + 1}</span>
                </div>
              ))}
            </div>
            <button onClick={exit} className="btn-ghost mt-12"><LogOut size={16} />Salir</button>
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
