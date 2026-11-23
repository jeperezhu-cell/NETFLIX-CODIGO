"use client";
import { useRef, useState } from "react";
import { KeyRound, Link2, Hash, ShieldCheck, LogIn, Lock, Copy, Check, ExternalLink, Loader2, MailSearch, Home, CheckCircle2, X, Timer } from "lucide-react";

const ICONS = { KeyRound, Link2, Hash, ShieldCheck, LogIn };
type A = { key: string; label: string; icon: keyof typeof ICONS; enabled: boolean };
type R = { key: string; type: "code" | "ready" | "none" | "done" | "manual" | "expired" | "unverified"; value?: string; url?: string; at?: string; mode?: "confirm" | "getcode"; debug?: string };
const HINT: Record<string, string> = { btn_pin: "Vence en 10 minutos", btn_login: "Vence en 15 minutos", btn_code4: "Vence en 15 minutos", btn_code6: "Vence en 15 minutos" };
const TRIES = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const post = (url: string, body: object) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
function since(at?: string) { if (!at) return ""; const m = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000)); return m < 1 ? "recibido ahora" : `recibido hace ${m} min`; }

export default function ActionButtons({ token, actions }: { token: string; actions: A[] }) {
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(""); const [res, setRes] = useState<R | null>(null);
  const [ok, setOk] = useState(false); const [attempt, setAttempt] = useState(0); const [working, setWorking] = useState(false); const [phase, setPhase] = useState("");
  const stop = useRef(false);

  // Busca en el correo; si aún no llegó, reintenta solo unos segundos
  async function run(key: string) {
    stop.current = false; setErr(""); setRes(null); setBusy(key);
    try {
      for (let i = 1; i <= TRIES && !stop.current; i++) {
        setAttempt(i);
        const r = await post(`/api/c/${token}/action`, { key }); const j = await r.json();
        if (!r.ok) { setErr(j.error); break; }
        if (j.type !== "none" || i === TRIES) { setRes({ ...j, key }); break; }
        await sleep(5000);
      }
    } catch { setErr("Sin conexión. Intenta de nuevo."); }
    setBusy(""); setAttempt(0);
  }

  async function checkOnce() {
    const r = await post(`/api/c/${token}/household`, { mode: "check" }); const j = await r.json();
    return r.ok && j.type === "done";
  }
  // Tras pulsar «Confirmar actualización» en el servidor, esperamos la prueba real: el correo de confirmación de Netflix
  async function verify(key: string, url?: string) {
    setPhase("verify");
    for (let i = 0; i < 9; i++) {
      await sleep(5000);
      if (await checkOnce().catch(() => false)) return setRes({ key, type: "done" });
    }
    setRes({ key, type: "unverified", url });
  }
  async function household(mode: "confirm" | "getcode", key: string) {
    setErr(""); setWorking(true); setPhase("work");
    try {
      const r = await post(`/api/c/${token}/household`, { mode }); const j = await r.json();
      if (!r.ok) setErr(j.error);
      else if (mode === "confirm" && j.type === "done") await verify(key, j.url);
      else setRes({ ...j, key, url: j.value });
    } catch { setErr("Sin conexión. Intenta de nuevo."); }
    setWorking(false); setPhase("");
  }
  async function recheck(key: string, url?: string) {
    setWorking(true); setPhase("verify");
    try { if (await checkOnce()) setRes({ key, type: "done" }); else setRes({ key, type: "unverified", url }); } catch { setErr("Sin conexión."); }
    setWorking(false); setPhase("");
  }
  async function copy(v: string) { await navigator.clipboard.writeText(v); setOk(true); setTimeout(() => setOk(false), 1500); }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((a, i) => {
          const Icon = ICONS[a.icon];
          return (
            <button key={a.key} disabled={!a.enabled || !!busy || working} onClick={() => run(a.key)}
              className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-blood/30 bg-gradient-to-br from-[#2a1014] to-black p-4 text-left transition duration-200 enabled:hover:-translate-y-1 enabled:hover:border-blood enabled:hover:shadow-glow disabled:opacity-40 ${i === 4 ? "sm:col-span-2" : ""}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-blood-glow to-blood-dark text-white shadow-ember">
                {busy === a.key ? <Loader2 size={22} className="animate-spin" /> : a.enabled ? <Icon size={22} /> : <Lock size={20} />}
              </span>
              <span className="font-semibold leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>

      {busy && (
        <div className="animate-pop-in flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/75" aria-live="polite">
          <Loader2 className="shrink-0 animate-spin text-blood" size={20} />
          <p className="flex-1">Buscando en el correo… {attempt > 1 && <span className="text-white/45">(intento {attempt}/{TRIES})</span>}</p>
          <button className="btn-ghost !px-3 !py-1.5" onClick={() => { stop.current = true; }}><X size={14} />Cancelar</button>
        </div>
      )}
      {err && <p role="alert" className="rounded-lg bg-blood/15 px-3 py-2 text-sm text-blood-glow">{err}</p>}

      {res?.type === "code" && (
        <div className="animate-pop-in rounded-2xl border border-blood bg-black/70 p-6 text-center shadow-glow" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Tu código</p>
          <p className="my-3 font-mono text-6xl font-bold tracking-[.2em] text-white">{res.value}</p>
          <p className="mb-4 text-xs text-white/50">{since(res.at)}{HINT[res.key] ? ` · ${HINT[res.key]}` : ""}</p>
          <button className="btn" onClick={() => copy(res.value!)}>{ok ? <Check size={18} /> : <Copy size={18} />}{ok ? "Copiado" : "Copiar código"}</button>
        </div>
      )}

      {res?.type === "ready" && (
        <div className="animate-pop-in rounded-2xl border border-blood bg-black/70 p-6 text-center shadow-glow" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Solicitud encontrada · {since(res.at)}</p>
          <p className="my-3 text-sm text-white/65">{res.mode === "confirm" ? "Ya llegó tu solicitud de Netflix. Pulsa el botón y nosotros la confirmamos por ti." : "Ya llegó tu mensaje de Netflix. Pulsa el botón para ver tu código."}</p>
          <button className="btn w-full !py-4 text-lg" disabled={working} onClick={() => household(res.mode ?? "confirm", res.key)}>
            {working ? <Loader2 size={20} className="animate-spin" /> : res.mode === "confirm" ? <Home size={20} /> : <ShieldCheck size={20} />}
            {working ? (phase === "verify" ? "Confirmando con Netflix…" : "Procesando… no cierres esta pantalla") : res.mode === "confirm" ? "PRESIONA PARA ACTUALIZAR HOGAR" : "PRESIONA PARA OBTENER EL CÓDIGO"}
          </button>
          {working && <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/45"><Timer size={13} />Puede tardar hasta 1 minuto</p>}
        </div>
      )}

      {res?.type === "done" && (
        <div className="animate-pop-in rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-6 text-center" aria-live="polite">
          <CheckCircle2 className="mx-auto text-emerald-400" size={44} />
          <p className="mt-3 text-xl font-bold">Se actualizó tu hogar</p>
          <p className="mt-1 text-white/70">Verifica tu dispositivo.</p>
        </div>
      )}

      {res?.type === "unverified" && (
        <div className="animate-pop-in rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center text-amber-50" aria-live="polite">
          <p className="font-semibold">Enviamos tu confirmación a Netflix</p>
          <p className="mt-1 text-sm text-amber-100/80">Netflix aún no nos responde. Verifica tu TV en unos segundos; si sigue pidiendo actualizar, revisa de nuevo.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn-ghost" disabled={working} onClick={() => recheck(res.key, res.url)}>{working ? <Loader2 size={16} className="animate-spin" /> : <MailSearch size={16} />}Revisar de nuevo</button>
            {res.url && <a className="btn-ghost" href={res.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Abrir Netflix en mi dispositivo</a>}
          </div>
        </div>
      )}

      {res?.type === "manual" && (
        <div className="animate-pop-in rounded-2xl border border-white/15 bg-black/60 p-5 text-center" aria-live="polite">
          <p className="text-sm text-white/70">No se pudo hacer automáticamente. Ábrelo desde tu dispositivo y pulsa el botón negro <b className="text-white">«Confirmar actualización»</b>.</p>
          <a className="btn mt-4" href={res.value} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} />Abrir Netflix</a>
          {res.debug && <p className="mt-3 break-words text-[10px] text-white/25">Detalle técnico: {res.debug}</p>}
        </div>
      )}

      {res?.type === "expired" && (
        <div className="animate-pop-in flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100" aria-live="polite">
          <Timer className="mt-0.5 shrink-0" size={20} /><p>El enlace ya venció. Pídelo de nuevo en tu TV o dispositivo y pulsa el botón otra vez.</p>
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
