"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, Bell, Smartphone, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { playSound } from "@/lib/sounds";

type Pro = { id: string; client_name: string; profile_name: string; email: string; days: number | null; status: string };
type H = { title: string; body: string; kind: string; push_sent: number; client_name: string; at: string };
type Diag = { configured: boolean; error?: string; devices: number; clients: number; dbError?: string };
const VARS = ["{usuario}", "{correo}", "{perfil}", "{vencimiento}", "{monto}"];
const TPL = [
  { n: "Por vencer", t: "Tu suscripción está por vencer", m: "Hola {usuario}, tu suscripción está próxima a vencer. Te recordamos que debes realizar tu pago el {vencimiento}." },
  { n: "Vence hoy", t: "Hoy vence tu suscripción", m: "Hola {usuario}, hoy vence tu suscripción. Por favor, realiza tu pago para mantener activo tu servicio." },
  { n: "Pendiente", t: "Renovación pendiente", m: "Hola {usuario}, tu suscripción se encuentra pendiente de renovación. Evita el corte y realiza tu pago." },
  { n: "Aviso general", t: "Aviso importante", m: "Hola {usuario}, tenemos un aviso importante para ti. Revisa tu panel." }
];

export default function NotificationsManager({ profiles, history, pushIds }: { profiles: Pro[]; history: H[]; pushIds: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState(""); const [sel, setSel] = useState<Set<string>>(new Set()); const [open, setOpen] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState(TPL[0].t); const [msg, setMsg] = useState(TPL[0].m);
  const [out, setOut] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false);
  const [diag, setDiag] = useState<Diag | null>(null);
  const push = useMemo(() => new Set(pushIds), [pushIds]);

  useEffect(() => { fetch("/api/admin/notifications").then((r) => r.json()).then(setDiag).catch(() => {}); }, []);

  const groups = useMemo(() => {
    const m = new Map<string, Pro[]>();
    for (const p of profiles) if (`${p.email} ${p.client_name}`.toLowerCase().includes(q.toLowerCase())) m.set(p.email, [...(m.get(p.email) ?? []), p]);
    return [...m.entries()];
  }, [profiles, q]);

  const toggle = (ids: string[], on: boolean) => setSel((s) => { const n = new Set(s); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });
  const pick = (f: (p: Pro) => boolean) => setSel(new Set(profiles.filter(f).map((p) => p.id)));
  const first = profiles.find((p) => sel.has(p.id));
  const fill = (s: string) => s.replace(/\{usuario\}/g, first?.client_name ?? "Cliente").replace(/\{correo\}/g, first?.email ?? "correo@icloud.com").replace(/\{perfil\}/g, first?.profile_name ?? "Perfil 01").replace(/\{vencimiento\}/g, "dd/mm/aaaa").replace(/\{monto\}/g, "S/ 0.00");

  async function send() {
    setBusy(true); setOut(null);
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 58_000); // nunca se queda "Enviando…" para siempre
    try {
      const r = await fetch("/api/admin/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, message: msg, profileIds: [...sel] }), signal: ctl.signal });
      const j = await r.json().catch(() => ({ error: `El servidor respondió con error ${r.status}. Revisa los registros en Vercel.` }));
      if (!r.ok) return setOut({ ok: false, text: j.error });
      playSound("sent");
      setOut({ ok: true, text: `Guardado en el panel de ${j.delivered} cliente(s). Push entregado a ${j.pushed} dispositivo(s).${j.noDevice ? ` ${j.noDevice} cliente(s) aún no activan avisos en su celular (solo lo verán dentro de su panel).` : ""}${j.skipped ? ` Omitidos por preferencias: ${j.skipped}.` : ""}${j.failed ? ` Con error: ${j.failed}.` : ""}${!j.push?.configured ? ` ⚠ ${j.push?.error}` : ""}` });
      setSel(new Set()); router.refresh();
    } catch (e) {
      setOut({ ok: false, text: (e as Error).name === "AbortError" ? "Tardó demasiado. Prueba enviando a menos clientes a la vez." : "No hay conexión con el servidor." });
    } finally { clearTimeout(timer); setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="title text-3xl">Notificaciones</h1>

      {diag && (diag.dbError || !diag.configured) && (
        <div className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 shrink-0" size={20} />
          <div><p className="font-semibold">Las notificaciones al celular aún no están completas</p>
            <p className="mt-1 text-amber-100/80">{diag.dbError ?? diag.error} Mientras tanto, los avisos sí se guardan y el cliente los ve dentro de su panel.</p></div></div>
      )}
      {diag && diag.configured && !diag.dbError && (
        <p className="flex items-center gap-2 text-sm text-white/60"><CheckCircle2 size={16} className="text-emerald-400" />Push listo · {diag.devices} dispositivo(s) de {diag.clients} cliente(s) con avisos activados</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3 p-5">
          <h2 className="title text-xl">Destinatarios <span className="text-sm font-normal text-white/50">· {sel.size} seleccionado(s)</span></h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <button className="btn-ghost !px-3 !py-1.5" onClick={() => pick(() => true)}>Todos</button>
            <button className="btn-ghost !px-3 !py-1.5" onClick={() => pick((p) => p.days !== null && p.days >= 0 && p.days <= 3 && p.status === "active")}>Vencen ≤ 3 días</button>
            <button className="btn-ghost !px-3 !py-1.5" onClick={() => pick((p) => p.days !== null && p.days < 0)}>Vencidos</button>
            <button className="btn-ghost !px-3 !py-1.5" onClick={() => pick((p) => push.has(p.id))}>Con push activo</button>
            <button className="btn-ghost !px-3 !py-1.5" onClick={() => setSel(new Set())}>Ninguno</button>
          </div>
          <div className="relative"><Search size={16} className="absolute left-3 top-4 text-white/40" />
            <input className="field pl-9" placeholder="Buscar por correo o cliente" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="max-h-[28rem] space-y-2 overflow-auto pr-1">
            {groups.map(([email, list]) => {
              const all = list.every((p) => sel.has(p.id)); const some = list.some((p) => sel.has(p.id)); const isOpen = open.has(email);
              return (
                <div key={email} className="rounded-xl border border-white/10 bg-black/30">
                  <div className="flex items-center gap-2 p-3">
                    <input type="checkbox" checked={all} ref={(el) => { if (el) el.indeterminate = some && !all; }} onChange={(e) => toggle(list.map((p) => p.id), e.target.checked)} aria-label={`Seleccionar ${email}`} />
                    <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen((o) => { const n = new Set(o); n.has(email) ? n.delete(email) : n.add(email); return n; })}>
                      <span className="min-w-0 flex-1 truncate font-semibold">{email}</span>
                      <span className="shrink-0 text-xs text-white/45">{list.length} perf.</span>
                      <ChevronDown size={16} className={`shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {isOpen && <ul className="space-y-1 border-t border-white/10 p-3 pl-9">{list.map((p) => (
                    <li key={p.id}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.has(p.id)} onChange={(e) => toggle([p.id], e.target.checked)} />
                      <span className="min-w-0 flex-1 truncate">{p.client_name} — {p.profile_name}</span>
                      {push.has(p.id) && <Smartphone size={14} className="shrink-0 text-emerald-400" aria-label="Avisos activados" />}</label></li>))}</ul>}
                </div>);
            })}
            {groups.length === 0 && <p className="text-sm text-white/55">No hay clientes que coincidan.</p>}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-white/45"><Smartphone size={13} className="text-emerald-400" />= ya activó los avisos en su celular</p>
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="title text-xl">Mensaje</h2>
          <div className="flex flex-wrap gap-2">{TPL.map((t) => <button key={t.n} type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => { setTitle(t.t); setMsg(t.m); }}>{t.n}</button>)}</div>
          <input className="field" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="field min-h-32" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="flex flex-wrap gap-2">{VARS.map((v) => <button key={v} type="button" className="btn-ghost !px-3 !py-1.5 font-mono" onClick={() => setMsg((m) => m + " " + v)}>{v}</button>)}</div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a1a1d] to-black p-4"><p className="mb-2 text-center text-[11px] uppercase tracking-widest text-white/40">Así se verá en el celular</p>
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blood text-white"><Bell size={18} /></span>
              <div className="min-w-0"><p className="text-[11px] text-white/50">ITACHI PERÚ · ahora</p><p className="truncate text-sm font-semibold">📢 {fill(title) || "Título"}</p><p className="text-xs text-white/75">{fill(msg)}</p></div></div></div>
          {out && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${out.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-blood/15 text-blood-glow"}`}>{out.text}</p>}
          <button className="btn w-full" disabled={busy || sel.size === 0 || !title || !msg} onClick={send}><Send size={16} />{busy ? "Enviando…" : `Enviar a ${sel.size} cliente(s)`}</button>
        </section>
      </div>

      <section className="panel p-5">
        <h2 className="title text-xl">Historial de envíos</h2>
        {history.length === 0 ? <p className="mt-3 text-white/55">Aún no se enviaron notificaciones.</p> :
          <ul className="mt-3 divide-y divide-white/10">{history.map((h, i) => (
            <li key={i} className="py-3 text-sm"><p className="font-semibold">{h.client_name} · {h.title}</p><p className="text-white/70">{h.body}</p>
              <p className="mt-1 text-xs text-white/40">{new Date(h.at).toLocaleString("es-PE", { timeZone: "America/Lima" })} · {h.kind} · {h.push_sent > 0 ? `push entregado (${h.push_sent})` : "solo en su panel (sin celular activado)"}</p></li>))}</ul>}
      </section>
    </div>
  );
}
