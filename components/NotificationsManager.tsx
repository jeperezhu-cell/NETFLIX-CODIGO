"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Search } from "lucide-react";

type Pro = { id: string; client_name: string; profile_name: string; email: string };
type H = { title: string; body: string; kind: string; push_sent: number; client_name: string; at: string };
const VARS = ["{usuario}", "{correo}", "{perfil}", "{vencimiento}", "{monto}"];

export default function NotificationsManager({ profiles, history }: { profiles: Pro[]; history: H[] }) {
  const router = useRouter();
  const [q, setQ] = useState(""); const [sel, setSel] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState(""); const [msg, setMsg] = useState("Hola {usuario}, recuerda que tu suscripción vence el {vencimiento}. Por favor, realiza tu pago para evitar la suspensión del servicio.");
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const m = new Map<string, Pro[]>();
    for (const p of profiles) if (`${p.email} ${p.client_name}`.toLowerCase().includes(q.toLowerCase())) m.set(p.email, [...(m.get(p.email) ?? []), p]);
    return [...m.entries()];
  }, [profiles, q]);

  const toggle = (ids: string[], on: boolean) => setSel((s) => { const n = new Set(s); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });
  const first = profiles.find((p) => sel.has(p.id));
  const preview = msg.replace("{usuario}", first?.client_name ?? "Cliente").replace("{correo}", first?.email ?? "correo@icloud.com").replace("{perfil}", first?.profile_name ?? "Perfil 01").replace("{vencimiento}", "dd/mm/aaaa").replace("{monto}", "S/ 0.00");

  async function send() {
    setBusy(true); setOut("");
    const r = await fetch("/api/admin/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, message: msg, profileIds: [...sel] }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setOut(j.error);
    setOut(`Enviado a ${j.delivered} cliente(s). Push entregados: ${j.pushed}. Omitidos por preferencias: ${j.skipped}.`); setSel(new Set()); router.refresh();
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold">Notificaciones</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl font-extrabold">Grupos de cuentas</h2>
          <div className="relative"><Search size={16} className="absolute left-3 top-4 text-white/40" />
            <input className="field pl-9" placeholder="Buscar por correo o cliente" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="max-h-96 space-y-4 overflow-auto pr-1">
            {groups.map(([email, list]) => {
              const all = list.every((p) => sel.has(p.id));
              return (
                <div key={email} className="rounded-lg border border-white/10 p-3">
                  <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={all} onChange={(e) => toggle(list.map((p) => p.id), e.target.checked)} />{email}<span className="text-xs font-normal text-white/45">{list.length} perfiles</span></label>
                  <ul className="mt-2 space-y-1 pl-6">{list.map((p) => (
                    <li key={p.id}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.has(p.id)} onChange={(e) => toggle([p.id], e.target.checked)} />{p.client_name} — {p.profile_name}</label></li>))}</ul>
                </div>);
            })}
            {groups.length === 0 && <p className="text-sm text-white/55">No hay clientes que coincidan.</p>}
          </div>
          <p className="text-sm text-white/60">{sel.size} seleccionado(s)</p>
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl font-extrabold">Mensaje</h2>
          <input className="field" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="field min-h-32" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="flex flex-wrap gap-2">{VARS.map((v) => <button key={v} type="button" className="btn-ghost !px-3 !py-1.5 font-mono" onClick={() => setMsg((m) => m + " " + v)}>{v}</button>)}</div>
          <div className="rounded-lg border border-blood/40 bg-black/50 p-4"><p className="text-xs text-white/50">Vista previa</p><p className="font-semibold">{title || "Título"}</p><p className="text-sm text-white/75">{preview}</p></div>
          {out && <p role="status" className="text-sm text-white/80">{out}</p>}
          <button className="btn w-full" disabled={busy || sel.size === 0 || !title || !msg} onClick={send}><Send size={16} />{busy ? "Enviando…" : "Enviar notificación"}</button>
        </section>
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-xl font-extrabold">Historial de envíos</h2>
        {history.length === 0 ? <p className="mt-3 text-white/55">Aún no se enviaron notificaciones.</p> :
          <ul className="mt-3 divide-y divide-white/10">{history.map((h, i) => (
            <li key={i} className="py-3 text-sm"><p className="font-semibold">{h.client_name} · {h.title}</p><p className="text-white/70">{h.body}</p>
              <p className="mt-1 text-xs text-white/40">{new Date(h.at).toLocaleString("es-PE", { timeZone: "America/Lima" })} · {h.kind} · {h.push_sent > 0 ? `push entregado (${h.push_sent})` : "solo historial (sin dispositivo activado)"}</p></li>))}</ul>}
      </section>
    </div>
  );
}
