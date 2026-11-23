"use client";
import { useState } from "react";
import { Save, Plug } from "lucide-react";

type S = { title: string; message: string; phone: string; phoneLabel: string };
export default function SettingsForm({ initial }: { initial: S }) {
  const [v, setV] = useState(initial); const [out, setOut] = useState(""); const [mail, setMail] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault(); setOut("");
    const r = await fetch("/api/admin/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(v) });
    setOut(r.ok ? "Cambios guardados." : (await r.json()).error);
  }
  async function test() {
    setMail("Probando…");
    const r = await fetch("/api/admin/mail-test", { method: "POST" }); const j = await r.json();
    setMail(r.ok ? `Conexión correcta. Mensajes en la bandeja: ${j.total}.` : j.error);
  }
  const set = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold">Configuración</h1>
      <form onSubmit={save} className="panel space-y-3 p-5">
        <h2 className="font-display text-xl font-extrabold">Pantalla de renovación</h2>
        <input className="field" value={v.title} onChange={set("title")} aria-label="Título" />
        <textarea className="field min-h-24" value={v.message} onChange={set("message")} aria-label="Mensaje" />
        <input className="field" value={v.phoneLabel} onChange={set("phoneLabel")} aria-label="Teléfono mostrado" />
        <input className="field" value={v.phone} onChange={set("phone")} inputMode="numeric" aria-label="Número para WhatsApp con código de país" />
        {out && <p role="status" className="text-sm text-white/80">{out}</p>}
        <button className="btn"><Save size={16} />Guardar cambios</button>
      </form>
      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-xl font-extrabold">Correo iCloud</h2>
        <p className="text-sm text-white/65">De este buzón salen los códigos y enlaces que ven los clientes en sus 4 botones.</p>
        <button className="btn-ghost" onClick={test}><Plug size={16} />Probar conexión</button>
        {mail && <p role="status" className="text-sm text-white/80">{mail}</p>}
      </section>
    </div>
  );
}
