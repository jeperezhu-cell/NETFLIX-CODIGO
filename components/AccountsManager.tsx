"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, Trash2, Ban, RotateCcw } from "lucide-react";
import Avatar from "./Avatar";
import { AVATARS } from "@/lib/avatars";

type Acc = { id: string; label: string; service: string; email: string; access_token: string; max_profiles: number };
type Pro = { id: string; account_id: string; profile_name: string; avatar_key: string; avatar_url: string | null; client_name: string; status: string; price: number | null; due_date: string | null };

const call = (url: string, method: string, body?: object) =>
  fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

function AddProfile({ accountId, onDone }: { accountId: string; onDone: () => void }) {
  const [err, setErr] = useState(""); const [avatar, setAvatar] = useState("rojo");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const r = await call(`/api/admin/accounts/${accountId}/profiles`, "POST", { ...f, avatar_key: avatar, price: f.price || undefined });
    if (!r.ok) return setErr((await r.json()).error);
    (e.target as HTMLFormElement).reset(); onDone();
  }
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/40 p-4 sm:grid-cols-2">
      <input name="profile_name" className="field" placeholder="Nombre del perfil (ej. Perfil 01)" required />
      <input name="client_name" className="field" placeholder="Nombre del cliente (para iniciar sesión)" required />
      <input name="client_password" className="field" placeholder="Contraseña del cliente" required />
      <input name="pin" className="field" placeholder="PIN de 4 dígitos" inputMode="numeric" maxLength={4} required />
      <input name="price" className="field" placeholder="Precio (S/)" inputMode="decimal" />
      <input name="due_date" type="date" className="field" aria-label="Fecha de vencimiento" />
      <input name="avatar_url" className="field sm:col-span-2" placeholder="URL de imagen del perfil (opcional, si no se usa el avatar)" />
      <div className="flex flex-wrap gap-2 sm:col-span-2" role="radiogroup" aria-label="Avatar">
        {AVATARS.map((a) => (
          <button type="button" key={a.key} onClick={() => setAvatar(a.key)} aria-pressed={avatar === a.key}
            className={`rounded-md ring-2 ${avatar === a.key ? "ring-white" : "ring-transparent"}`}><Avatar k={a.key} size={44} /></button>
        ))}
      </div>
      {err && <p role="alert" className="text-sm text-blood-glow sm:col-span-2">{err}</p>}
      <button className="btn sm:col-span-2"><Plus size={16} />Agregar perfil</button>
    </form>
  );
}

export default function AccountsManager({ accounts, profiles }: { accounts: Acc[]; profiles: Pro[] }) {
  const router = useRouter();
  const [err, setErr] = useState(""); const [copied, setCopied] = useState(""); const [open, setOpen] = useState("");
  const refresh = () => router.refresh();

  async function createAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const r = await call("/api/admin/accounts", "POST", f);
    if (!r.ok) return setErr((await r.json()).error);
    (e.target as HTMLFormElement).reset(); refresh();
  }
  async function copyLink(token: string) {
    await navigator.clipboard.writeText(`${location.origin}/c/${token}`); setCopied(token); setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold">Cuentas y perfiles</h1>

      <form onSubmit={createAccount} className="panel grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="font-display text-xl font-extrabold sm:col-span-2">Nueva cuenta (genera un link nuevo)</h2>
        <input name="label" className="field" placeholder="Nombre interno (ej. Netflix 01)" required />
        <input name="service" className="field" defaultValue="Netflix" required />
        <input name="email" type="email" className="field" placeholder="Correo de la cuenta" required />
        <input name="password" className="field" placeholder="Contraseña de la cuenta" required />
        {err && <p role="alert" className="text-sm text-blood-glow sm:col-span-2">{err}</p>}
        <button className="btn sm:col-span-2"><Plus size={16} />Crear cuenta</button>
      </form>

      {accounts.length === 0 && <p className="text-white/55">Todavía no hay cuentas. Crea la primera arriba.</p>}

      {accounts.map((a) => {
        const list = profiles.filter((p) => p.account_id === a.id);
        const full = list.length >= a.max_profiles;
        return (
          <section key={a.id} className="panel p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <h2 className="font-display text-xl font-extrabold">{a.label} <span className="text-sm font-normal text-white/50">· {a.service}</span></h2>
                <p className="text-sm text-white/60">{a.email} — {list.length}/{a.max_profiles} perfiles</p>
              </div>
              <button className="btn-ghost" onClick={() => copyLink(a.access_token)}>{copied === a.access_token ? <Check size={16} /> : <Copy size={16} />}Copiar link</button>
            </div>
            <p className="mt-2 break-all text-xs text-white/40">/c/{a.access_token}</p>

            <ul className="mt-4 divide-y divide-white/10">
              {list.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar k={p.avatar_key} url={p.avatar_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.client_name} <span className="font-normal text-white/50">· {p.profile_name}</span></p>
                    <p className="text-xs text-white/50">{p.status === "active" ? "Activo" : "Suspendido"}{p.due_date ? ` · vence ${p.due_date}` : ""}{p.price ? ` · S/ ${p.price}` : ""}</p>
                  </div>
                  <button className="btn-ghost" onClick={async () => { await call(`/api/admin/profiles/${p.id}`, "PATCH", { status: p.status === "active" ? "suspended" : "active" }); refresh(); }}>
                    {p.status === "active" ? <><Ban size={16} />Suspender</> : <><RotateCcw size={16} />Reactivar</>}
                  </button>
                  <button className="btn-ghost" aria-label="Eliminar perfil" onClick={async () => { if (confirm(`¿Eliminar a ${p.client_name}?`)) { await call(`/api/admin/profiles/${p.id}`, "DELETE"); refresh(); } }}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>

            {full ? <p className="mt-3 text-sm text-white/55">Esta cuenta ya tiene el máximo de {a.max_profiles} perfiles.</p> :
              <>
                <button className="btn-ghost mt-3" onClick={() => setOpen(open === a.id ? "" : a.id)}><Plus size={16} />Agregar perfil</button>
                {open === a.id && <AddProfile accountId={a.id} onDone={refresh} />}
              </>}
          </section>
        );
      })}
    </div>
  );
}
