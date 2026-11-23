"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plug, UserCog } from "lucide-react";

type S = { title: string; message: string; phone: string; phoneLabel: string };
export default function SettingsForm({ initial, username }: { initial: S; username: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial); const [out, setOut] = useState(""); const [mail, setMail] = useState("");
  const [me, setMe] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false);

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
  async function changeMe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMe(null); setBusy(true);
    const form = e.currentTarget; const f = new FormData(form);
    const nu = String(f.get("new_username") ?? "").trim(), np = String(f.get("new_password") ?? ""), rp = String(f.get("repeat") ?? "");
    if (np && np !== rp) { setBusy(false); return setMe({ ok: false, text: "Las contraseñas nuevas no coinciden." }); }
    try {
      const r = await fetch("/api/admin/me", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ current_password: f.get("current_password"), new_username: nu && nu !== username ? nu : undefined, new_password: np || undefined }) });
      const j = await r.json();
      if (!r.ok) return setMe({ ok: false, text: j.error });
      form.reset(); setMe({ ok: true, text: "Listo. Tus datos de ingreso se actualizaron." }); router.refresh();
    } catch { setMe({ ok: false, text: "Sin conexión." }); } finally { setBusy(false); }
  }
  const set = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="space-y-8">
      <h1 className="title text-3xl">Configuración</h1>

      <form onSubmit={changeMe} className="panel space-y-3 p-5">
        <h2 className="title flex items-center gap-2 text-xl"><UserCog size={20} className="text-blood" />Mi usuario y contraseña</h2>
        <p className="text-sm text-white/60">Usuario actual: <b className="text-white">{username}</b>. Deja vacío lo que no quieras cambiar.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="new_username" className="field" placeholder="Nuevo usuario" autoComplete="off" />
          <span />
          <input name="new_password" type="password" className="field" placeholder="Nueva contraseña (mín. 10)" autoComplete="new-password" />
          <input name="repeat" type="password" className="field" placeholder="Repite la nueva contraseña" autoComplete="new-password" />
        </div>
        <input name="current_password" type="password" className="field" placeholder="Tu contraseña actual (obligatoria)" autoComplete="current-password" required />
        {me && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${me.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-blood/15 text-blood-glow"}`}>{me.text}</p>}
        <button className="btn" disabled={busy}><Save size={16} />{busy ? "Guardando…" : "Actualizar mis datos"}</button>
      </form>

      <form onSubmit={save} className="panel space-y-3 p-5">
        <h2 className="title text-xl">Pantalla de renovación</h2>
        <input className="field" value={v.title} onChange={set("title")} aria-label="Título" />
        <textarea className="field min-h-24" value={v.message} onChange={set("message")} aria-label="Mensaje" />
        <input className="field" value={v.phoneLabel} onChange={set("phoneLabel")} aria-label="Teléfono mostrado" />
        <input className="field" value={v.phone} onChange={set("phone")} inputMode="numeric" aria-label="Número para WhatsApp con código de país" />
        {out && <p role="status" className="text-sm text-white/80">{out}</p>}
        <button className="btn"><Save size={16} />Guardar cambios</button>
      </form>
      <section className="panel space-y-3 p-5">
        <h2 className="title text-xl">Correo iCloud</h2>
        <p className="text-sm text-white/65">De este buzón salen los códigos y enlaces que ven los clientes en sus botones.</p>
        <button className="btn-ghost" onClick={test}><Plug size={16} />Probar conexión</button>
        {mail && <p role="status" className="text-sm text-white/80">{mail}</p>}
      </section>
    </div>
  );
}
