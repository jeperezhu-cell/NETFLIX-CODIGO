"use client";
import { useState } from "react";
import { KeyRound, Link2, Hash, ShieldCheck, Lock, Copy, Check, ExternalLink, Loader2 } from "lucide-react";

const ICONS = { KeyRound, Link2, Hash, ShieldCheck };
type A = { key: string; label: string; icon: keyof typeof ICONS; enabled: boolean };
type R = { key: string; type: "code" | "link" | "none"; value?: string; at?: string };

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
        {actions.map((a) => {
          const Icon = ICONS[a.icon];
          return (
            <button key={a.key} disabled={!a.enabled || !!busy} onClick={() => run(a.key)}
              className="flex items-center gap-3 rounded-lg border border-blood/40 bg-gradient-to-br from-ash to-black p-4 text-left transition enabled:hover:border-blood enabled:hover:shadow-ember disabled:opacity-40">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-blood/15 text-blood">
                {busy === a.key ? <Loader2 size={22} className="animate-spin" /> : a.enabled ? <Icon size={22} /> : <Lock size={20} />}
              </span>
              <span className="font-semibold leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>
      {err && <p role="alert" className="text-sm text-blood-glow">{err}</p>}
      {res?.type === "code" && (
        <div className="rounded-lg border border-blood bg-black/60 p-5 text-center" aria-live="polite">
          <p className="text-sm text-white/60">Tu código</p>
          <p className="my-2 font-mono text-5xl font-bold tracking-[.25em]">{res.value}</p>
          <button className="btn-ghost" onClick={() => copy(res.value!)}>{ok ? <Check size={16} /> : <Copy size={16} />}Copiar código</button>
        </div>
      )}
      {res?.type === "link" && (
        <div className="rounded-lg border border-blood bg-black/60 p-5 text-center" aria-live="polite">
          <p className="mb-3 text-sm text-white/60">Enlace listo. Ábrelo desde el mismo dispositivo donde lo pediste.</p>
          <a className="btn" href={res.value} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} />Abrir enlace de Netflix</a>
        </div>
      )}
      {res?.type === "none" && (
        <p className="rounded-lg border border-white/15 p-4 text-sm text-white/75" aria-live="polite">
          Aún no llega ningún mensaje reciente. Primero pide el código o enlace en tu TV o dispositivo, espera unos segundos y pulsa de nuevo.
        </p>
      )}
    </div>
  );
}
