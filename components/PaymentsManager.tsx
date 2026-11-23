"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2 } from "lucide-react";

type Pro = { id: string; client_name: string; profile_name: string; price: number | null; due_date: string | null; label: string; email: string };
type Pay = { id: string; client_name: string; amount: number; paid_at: string; next_due: string; notes: string | null; receipt_id: string | null };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
function addMonth(iso: string) { const [y, m, d] = iso.split("-").map(Number); const t = new Date(Date.UTC(y, m, 1)); const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(d, last)); return t.toISOString().slice(0, 10); }

export default function PaymentsManager({ profiles, payments }: { profiles: Pro[]; payments: Pay[] }) {
  const router = useRouter();
  const [pid, setPid] = useState(""); const [paid, setPaid] = useState(today()); const [next, setNext] = useState(""); const [amount, setAmount] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  function suggest(id: string, paidAt: string) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    const base = p.due_date && p.due_date > paidAt ? p.due_date : paidAt; // pago anticipado: suma desde el vencimiento actual
    setNext(addMonth(base)); if (p.price != null) setAmount(String(p.price));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const form = e.currentTarget; const fd = new FormData(form);
    const r = await fetch("/api/admin/payments", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) return setErr((await r.json()).error);
    form.reset(); setPid(""); setNext(""); setAmount(""); setPaid(today()); router.refresh();
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold">Pagos y recibos</h1>
      <form onSubmit={submit} className="panel grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="font-display text-xl font-extrabold sm:col-span-2">Registrar pago (también anticipado)</h2>
        <select name="profile_id" required className="field sm:col-span-2" value={pid} onChange={(e) => { setPid(e.target.value); suggest(e.target.value, paid); }}>
          <option value="">Elige cliente…</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.client_name} · {p.profile_name} · {p.label}{p.due_date ? ` · vence ${p.due_date}` : ""}</option>)}
        </select>
        <input name="amount" className="field" placeholder="Importe (S/)" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input name="paid_at" type="date" className="field" required value={paid} onChange={(e) => { setPaid(e.target.value); suggest(pid, e.target.value); }} aria-label="Fecha de pago" />
        <label className="text-sm text-white/60 sm:col-span-2">Próximo vencimiento
          <input name="next_due" type="date" className="field mt-1" required value={next} onChange={(e) => setNext(e.target.value)} /></label>
        <input name="notes" className="field sm:col-span-2" placeholder="Observaciones (opcional)" />
        <input name="description" className="field" placeholder="Descripción del recibo (opcional)" />
        <input name="receipt" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="field" aria-label="Comprobante" />
        {err && <p role="alert" className="text-sm text-blood-glow sm:col-span-2">{err}</p>}
        <button className="btn sm:col-span-2" disabled={busy}><Plus size={16} />{busy ? "Guardando…" : "Registrar pago"}</button>
      </form>

      <section className="panel p-5">
        <h2 className="font-display text-xl font-extrabold">Últimos pagos</h2>
        {payments.length === 0 ? <p className="mt-3 text-white/55">Aún no hay pagos registrados.</p> :
          <ul className="mt-3 divide-y divide-white/10">{payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1"><p className="font-semibold">{p.client_name} · S/ {p.amount.toFixed(2)}</p>
                <p className="text-white/50">Pagó {p.paid_at} · próximo {p.next_due}{p.notes ? ` · ${p.notes}` : ""}</p></div>
              {p.receipt_id && <>
                <a className="btn-ghost" href={`/api/admin/receipts/${p.receipt_id}`} target="_blank" rel="noopener"><FileText size={16} />Recibo</a>
                <button className="btn-ghost" aria-label="Eliminar recibo" onClick={async () => { if (confirm("¿Eliminar este recibo?")) { await fetch(`/api/admin/receipts/${p.receipt_id}`, { method: "DELETE" }); router.refresh(); } }}><Trash2 size={16} /></button></>}
            </li>))}</ul>}
      </section>
    </div>
  );
}
