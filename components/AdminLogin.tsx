"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: f.get("username"), password: f.get("password") }) });
    setBusy(false);
    if (r.ok) router.push("/admin"); else setErr((await r.json()).error ?? "No se pudo iniciar sesión");
  }
  return (
    <form onSubmit={submit} className="panel space-y-4 p-6">
      <h2 className="font-display text-2xl font-extrabold">Ingreso del administrador</h2>
      <input name="username" className="field" placeholder="Usuario" autoComplete="username" required />
      <input name="password" type="password" className="field" placeholder="Contraseña" autoComplete="current-password" required />
      {err && <p role="alert" className="text-sm text-blood-glow">{err}</p>}
      <button className="btn w-full" disabled={busy}><LogIn size={18} />{busy ? "Verificando…" : "Ingresar"}</button>
    </form>
  );
}
