"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import Sharingan from "./Sharingan";

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
    <form onSubmit={submit} className="panel animate-pop-in space-y-4 p-7">
      <div className="flex items-center gap-3">
        <Sharingan className="h-12 w-12 animate-spin-slow" />
        <div><h2 className="title text-2xl">Administrador</h2><p className="flex items-center gap-1.5 text-xs text-white/50"><ShieldCheck size={13} />Acceso privado</p></div>
      </div>
      <input name="username" className="field" placeholder="Usuario" autoComplete="username" required />
      <input name="password" type="password" className="field" placeholder="Contraseña" autoComplete="current-password" required />
      {err && <p role="alert" className="rounded-lg bg-blood/15 px-3 py-2 text-sm text-blood-glow">{err}</p>}
      <button className="btn w-full" disabled={busy}><LogIn size={18} />{busy ? "Verificando…" : "Ingresar"}</button>
    </form>
  );
}
