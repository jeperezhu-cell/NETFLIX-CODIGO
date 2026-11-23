"use client";
import { useState } from "react";
import { KeyRound, Link2, Hash, ShieldCheck, LogIn, Lock, Copy, Check, ExternalLink, Loader2, MailSearch } from "lucide-react";

const ICONS = { KeyRound, Link2, Hash, ShieldCheck, LogIn };
type A = { key: string; label: string; icon: keyof typeof ICONS; enabled: boolean };
type R = { key: string; type: "code" | "link" | "none"; value?: string; at?: string };
const HINT: Record<string, string> = { btn_pin: "Vence en 10 minutos", btn_login: "Vence en 15 minutos", btn_code4: "Vence en 15 minutos" };

function since(at?: string) { if (!at) return ""; const m = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000)); return m < 1 ? "recibido ahora" : `recibido hace ${m} min`; }

export default function ActionButtons({ token, actions }: { token: string; actions: A[] }) {
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(""); const [res, setRes] = useState<R | null>(null); const [ok, setOk] = useState(false);

  async function run(key: string) {
    setErr(""); setRes(null); setBusy(key);
    const r = await fetch(`/api/c/${token}/action`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
    const j = await r.json(); setBusy("");
    if (!r.ok) return setErr(j.error);
    setRes({ ...j, key });
  }
  async function copy(v: string) { await navigator.clipboard.writeText(v); setOk(true); setTimeout(() => setOk(false), 1500); }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((a, i) => {
          const Icon = ICONS[a.icon];
          return (
            <button key={a.key} disabled={!a.enabled || !!busy} onClick={() => run(a.key)}
              className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-blood/30 bg-gradient-to-br from-[#2a1014] to-black p-4 text-left transition duration-200 enabled:hover:-translate-y-1 enabled:hover:border-blood enabled:hover:shadow-glow disabled:opacity-40 ${i === 4 ? "sm:col-span-2" : ""}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-blood-glow to-blood-dark text-white shadow-ember">
                {busy === a.key ? <Loader2 size={22} className="animate-spin" /> : a.enabled ? <Icon size={22} /> : <Lock size={20} />}
              </span>
              <span className="font-semibold leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>
      {err && <p role="alert" className="rounded-lg bg-blood/15 px-3 py-2 text-sm text-blood-glow">{err}</p>}

      {res?.type === "code" && (
        <div className="animate-pop-in rounded-2xl border border-blood bg-black/70 p-6 text-center shadow-glow" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Tu código</p>
          <p className="my-3 font-mono text-6xl font-bold tracking-[.2em] text-white">{res.value}</p>
          <p className="mb-4 text-xs text-white/50">{since(res.at)}{HINT[res.key] ? ` · ${HINT[res.key]}` : ""}</p>
          <button className="btn" onClick={() => copy(res.value!)}>{ok ? <Check size={18} /> : <Copy size={18} />}{ok ? "Copiado" : "Copiar código"}</button>
        </div>
      )}
      {res?.type === "link" && (
        <div className="animate-pop-in rounded-2xl border border-blood bg-black/70 p-6 text-center shadow-glow" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Enlace listo · {since(res.at)}</p>
          <p className="my-3 text-sm text-white/65">Ábrelo desde el mismo dispositivo donde lo pediste.</p>
          <a className="btn" href={res.value} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} />Abrir enlace de Netflix</a>
        </div>
      )}
      {res?.type === "none" && (
        <div className="animate-pop-in flex gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/75" aria-live="polite">
          <MailSearch className="mt-0.5 shrink-0 text-blood" size={20} />
          <p>Aún no llega ningún mensaje reciente para esta opción. Primero pídelo en tu TV o dispositivo, espera unos segundos y pulsa de nuevo.</p>
        </div>
      )}
    </div>
  );
}
