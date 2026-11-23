"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, Trash2, Ban, RotateCcw, ChevronDown, Search, Pencil, CalendarPlus, ExternalLink, Eye, EyeOff, X, Save, ClipboardCopy, RefreshCw, AlertTriangle, Mail } from "lucide-react";
import Avatar from "./Avatar";
import { AVATARS } from "@/lib/avatars";
import { ACTIONS } from "@/lib/config";

type Acc = { id: string; label: string; service: string; email: string; access_token: string; max_profiles: number; status: string; notes: string | null };
type Pro = { id: string; account_id: string; profile_name: string; avatar_key: string; avatar_url: string | null; client_name: string; status: string; price: number | null; due_date: string | null; days: number | null; notes: string | null; perms: Record<string, boolean> };
type Filter = "all" | "overdue" | "soon" | "suspended" | "free";

const call = (url: string, method: string, body?: object) =>
  fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
const PERMS = [{ key: "show_email", label: "Ver correo" }, { key: "show_password", label: "Ver contraseña de Netflix" }, { key: "show_profile", label: "Ver nombre del perfil" },
  ...ACTIONS.map((a) => ({ key: a.key as string, label: a.label }))];
const fmt = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "");
const tone = (d: number | null) => d === null ? "bg-white/10 text-white/60" : d < 0 ? "bg-blood/20 text-blood-glow" : d <= 3 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300";
const dLabel = (d: number | null) => d === null ? "sin fecha" : d < 0 ? `venció hace ${-d}d` : d === 0 ? "vence hoy" : `en ${d}d`;

/* ───────── Modal base ───────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="panel animate-pop-in my-auto w-full max-w-2xl p-5 sm:p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="title text-2xl">{title}</h2>
          <button className="btn-ghost !px-2.5" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

/* ───────── Crear / editar perfil (cliente) ───────── */
function ProfileModal({ acc, profile, onClose, onDone, flash }: { acc: Acc; profile?: Pro; onClose: () => void; onDone: () => void; flash: (m: string) => void }) {
  const edit = !!profile;
  const [f, setF] = useState({
    profile_name: profile?.profile_name ?? "", client_name: profile?.client_name ?? "", client_password: "", pin: "",
    price: profile?.price != null ? String(profile.price) : "", due_date: profile?.due_date ?? "", avatar_url: profile?.avatar_url ?? "", notes: profile?.notes ?? "",
    avatar_key: profile?.avatar_key ?? "rojo"
  });
  const [perms, setPerms] = useState<Record<string, boolean>>({ ...Object.fromEntries(PERMS.map((p) => [p.key, true])), ...(profile?.perms ?? {}) });
  const [orig, setOrig] = useState({ pw: "", pin: "" }); const [loaded, setLoaded] = useState(!edit);
  const [show, setShow] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/admin/profiles/${profile.id}`).then((r) => r.json()).then((j) => {
      setF((x) => ({ ...x, client_password: j.client_password ?? "", pin: j.pin ?? "" })); setOrig({ pw: j.client_password ?? "", pin: j.pin ?? "" }); setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [profile]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const price = f.price.trim() === "" ? null : Number(f.price);
      if (price !== null && Number.isNaN(price)) return setErr("El precio no es válido");
      let r: Response;
      if (edit) {
        r = await call(`/api/admin/profiles/${profile!.id}`, "PATCH", {
          profile_name: f.profile_name, client_name: f.client_name, avatar_key: f.avatar_key, avatar_url: f.avatar_url, price, due_date: f.due_date, notes: f.notes, perms,
          ...(f.client_password && f.client_password !== orig.pw ? { client_password: f.client_password } : {}),
          ...(f.pin && f.pin !== orig.pin ? { pin: f.pin } : {})
        });
      } else {
        r = await call(`/api/admin/accounts/${acc.id}/profiles`, "POST", { ...f, price: price ?? undefined, perms });
      }
      const j = await r.json(); if (!r.ok) return setErr(j.error);
      flash(edit ? "Cliente actualizado" : "Perfil agregado"); onDone(); onClose();
    } catch { setErr("Sin conexión"); } finally { setBusy(false); }
  }
  async function copyData() {
    const msg = `Hola ${f.client_name} 👋 Estos son tus datos de acceso:\n🔗 Link: ${location.origin}/c/${acc.access_token}\n👤 Usuario: ${f.client_name}\n🔑 Contraseña: ${f.client_password}\n📌 Perfil: ${f.profile_name}\n🔢 PIN: ${f.pin}`;
    await navigator.clipboard.writeText(msg); flash("Datos copiados, listos para pegar en WhatsApp");
  }

  return (
    <Modal title={edit ? `Editar · ${profile!.client_name}` : "Agregar perfil"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/50">Nombre del perfil<input className="field mt-1" value={f.profile_name} onChange={set("profile_name")} placeholder="Ej. Perfil 01" required /></label>
        <label className="text-xs text-white/50">Nombre del cliente (usuario para entrar)<input className="field mt-1" value={f.client_name} onChange={set("client_name")} required minLength={2} /></label>
        <label className="text-xs text-white/50">Contraseña de acceso del cliente
          <span className="relative mt-1 block"><input className="field pr-12" type={show ? "text" : "password"} value={f.client_password} onChange={set("client_password")} required={!edit} minLength={4} placeholder={loaded ? (edit && !orig.pw ? "Escribe una nueva para cambiarla" : "") : "Cargando…"} />
            <button type="button" className="absolute right-3 top-3.5 text-white/50" onClick={() => setShow(!show)} aria-label="Mostrar u ocultar">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        <label className="text-xs text-white/50">PIN de 4 dígitos<input className="field mt-1 font-mono tracking-widest" type={show ? "text" : "password"} inputMode="numeric" maxLength={4} pattern="\d{4}" value={f.pin} onChange={set("pin")} required={!edit} placeholder={edit && !orig.pin ? "Nuevo PIN" : ""} /></label>
        <label className="text-xs text-white/50">Precio (S/)<input className="field mt-1" inputMode="decimal" value={f.price} onChange={set("price")} /></label>
        <label className="text-xs text-white/50">Vencimiento<input className="field mt-1" type="date" value={f.due_date} onChange={set("due_date")} /></label>
        <label className="text-xs text-white/50 sm:col-span-2">URL de imagen del perfil (opcional)<input className="field mt-1" value={f.avatar_url} onChange={set("avatar_url")} placeholder="https://…" /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2" role="radiogroup" aria-label="Avatar">
          {AVATARS.map((a) => <button type="button" key={a.key} onClick={() => setF({ ...f, avatar_key: a.key })} aria-pressed={f.avatar_key === a.key} className={`rounded-md ring-2 ${f.avatar_key === a.key ? "ring-white" : "ring-transparent"}`}><Avatar k={a.key} size={40} /></button>)}
        </div>
        <label className="text-xs text-white/50 sm:col-span-2">Notas internas (solo tú las ves)<textarea className="field mt-1 min-h-16" value={f.notes} onChange={set("notes")} /></label>
        <fieldset className="rounded-xl border border-white/10 p-3 sm:col-span-2"><legend className="px-2 text-xs text-white/50">Qué puede ver y usar este cliente</legend>
          <div className="grid gap-2 sm:grid-cols-2">{PERMS.map((p) => (
            <label key={p.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={perms[p.key] !== false} onChange={(e) => setPerms({ ...perms, [p.key]: e.target.checked })} />{p.label}</label>))}</div></fieldset>
        {err && <p role="alert" className="rounded-lg bg-blood/15 px-3 py-2 text-sm text-blood-glow sm:col-span-2">{err}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className="btn flex-1" disabled={busy}><Save size={16} />{busy ? "Guardando…" : edit ? "Guardar cambios" : "Agregar perfil"}</button>
          {edit && <button type="button" className="btn-ghost" onClick={copyData}><ClipboardCopy size={16} />Copiar datos para el cliente</button>}
        </div>
      </form>
    </Modal>
  );
}

/* ───────── Crear / editar cuenta de Netflix ───────── */
function AccountModal({ acc, onClose, onDone, flash }: { acc?: Acc; onClose: () => void; onDone: () => void; flash: (m: string) => void }) {
  const edit = !!acc;
  const [f, setF] = useState({ label: acc?.label ?? "", service: acc?.service ?? "Netflix", email: acc?.email ?? "", password: "", notes: acc?.notes ?? "" });
  const [orig, setOrig] = useState(""); const [show, setShow] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (acc) fetch(`/api/admin/accounts/${acc.id}`).then((r) => r.json()).then((j) => { setF((x) => ({ ...x, password: j.password ?? "" })); setOrig(j.password ?? ""); }).catch(() => {}); }, [acc]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = edit
        ? await call(`/api/admin/accounts/${acc!.id}`, "PATCH", { label: f.label, service: f.service, email: f.email, notes: f.notes, ...(f.password && f.password !== orig ? { password: f.password } : {}) })
        : await call("/api/admin/accounts", "POST", { label: f.label, service: f.service, email: f.email, password: f.password });
      const j = await r.json(); if (!r.ok) return setErr(j.error);
      flash(edit ? "Cuenta actualizada" : "Cuenta creada"); onDone(); onClose();
    } catch { setErr("Sin conexión"); } finally { setBusy(false); }
  }
  async function regen() {
    if (!acc || !confirm("Se creará un link NUEVO y el link anterior dejará de funcionar. ¿Continuar?")) return;
    const r = await call(`/api/admin/accounts/${acc.id}`, "PATCH", { regenerate_link: true });
    if (r.ok) { flash("Link regenerado. Copia el nuevo link."); onDone(); onClose(); }
  }
  async function remove() {
    if (!acc || !confirm(`¿ELIMINAR la cuenta ${acc.email} y TODOS sus perfiles? No se puede deshacer.`)) return;
    const r = await call(`/api/admin/accounts/${acc.id}`, "DELETE"); if (r.ok) { flash("Cuenta eliminada"); onDone(); onClose(); }
  }
  return (
    <Modal title={edit ? "Editar cuenta" : "Nueva cuenta (genera un link nuevo)"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/50">Nombre interno<input className="field mt-1" value={f.label} onChange={set("label")} placeholder="Ej. Netflix 01" required /></label>
        <label className="text-xs text-white/50">Servicio<input className="field mt-1" value={f.service} onChange={set("service")} required /></label>
        <label className="text-xs text-white/50 sm:col-span-2">Correo de la cuenta<input className="field mt-1" type="email" value={f.email} onChange={set("email")} required /></label>
        <label className="text-xs text-white/50 sm:col-span-2">Contraseña de la cuenta de Netflix
          <span className="relative mt-1 block"><input className="field pr-12" type={show ? "text" : "password"} value={f.password} onChange={set("password")} required={!edit} />
            <button type="button" className="absolute right-3 top-3.5 text-white/50" onClick={() => setShow(!show)} aria-label="Mostrar u ocultar">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {edit && <label className="text-xs text-white/50 sm:col-span-2">Notas internas<textarea className="field mt-1 min-h-16" value={f.notes} onChange={set("notes")} /></label>}
        {err && <p role="alert" className="rounded-lg bg-blood/15 px-3 py-2 text-sm text-blood-glow sm:col-span-2">{err}</p>}
        <button className="btn sm:col-span-2" disabled={busy}><Save size={16} />{busy ? "Guardando…" : edit ? "Guardar cambios" : "Crear cuenta"}</button>
        {edit && <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3 sm:col-span-2">
          <button type="button" className="btn-ghost" onClick={regen}><RefreshCw size={16} />Regenerar link</button>
          <button type="button" className="btn-ghost !text-blood-glow" onClick={remove}><Trash2 size={16} />Eliminar cuenta</button></div>}
      </form>
    </Modal>
  );
}

/* ───────── Pantalla principal ───────── */
export default function AccountsManager({ accounts, profiles }: { accounts: Acc[]; profiles: Pro[] }) {
  const router = useRouter();
  const [q, setQ] = useState(""); const [filter, setFilter] = useState<Filter>("all"); const [open, setOpen] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState(""); const [copied, setCopied] = useState("");
  const [modal, setModal] = useState<{ kind: "newAcc" } | { kind: "editAcc"; acc: Acc } | { kind: "addPro"; acc: Acc } | { kind: "editPro"; acc: Acc; pro: Pro } | null>(null);
  const refresh = () => router.refresh();
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  const rows = useMemo(() => accounts.map((a) => {
    const list = profiles.filter((p) => p.account_id === a.id);
    return { a, list, overdue: list.filter((p) => p.status === "active" && p.days !== null && p.days < 0).length,
      soon: list.filter((p) => p.status === "active" && p.days !== null && p.days >= 0 && p.days <= 3).length, susp: list.filter((p) => p.status !== "active").length };
  }), [accounts, profiles]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(({ a, list, overdue, soon, susp }) => {
      if (t && !`${a.email} ${a.label} ${list.map((p) => `${p.client_name} ${p.profile_name}`).join(" ")}`.toLowerCase().includes(t)) return false;
      if (filter === "overdue") return overdue > 0; if (filter === "soon") return soon > 0;
      if (filter === "suspended") return susp > 0 || a.status !== "active"; if (filter === "free") return list.length < a.max_profiles;
      return true;
    });
  }, [rows, q, filter]);

  const totals = { acc: accounts.length, cli: profiles.length, overdue: rows.reduce((n, r) => n + r.overdue, 0), free: rows.reduce((n, r) => n + (r.a.max_profiles - r.list.length), 0) };
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  async function copyLink(token: string) { await navigator.clipboard.writeText(`${location.origin}/c/${token}`); setCopied(token); setTimeout(() => setCopied(""), 1500); }
  async function copyEmail(email: string) { await navigator.clipboard.writeText(email); flash("Correo copiado"); }
  async function setStatus(p: Pro) { await call(`/api/admin/profiles/${p.id}`, "PATCH", { status: p.status === "active" ? "suspended" : "active" }); refresh(); }
  async function renew(p: Pro) {
    if (!confirm(`¿Renovar 1 mes a ${p.client_name}${p.price ? ` (S/ ${p.price})` : ""}? Se registra el pago y se reactiva.`)) return;
    const r = await call(`/api/admin/profiles/${p.id}`, "PATCH", { action: "renew" }); const j = await r.json();
    flash(r.ok ? `Renovado hasta ${fmt(j.due)}` : j.error); refresh();
  }
  async function remove(p: Pro) { if (confirm(`¿Eliminar a ${p.client_name}?`)) { await call(`/api/admin/profiles/${p.id}`, "DELETE"); refresh(); } }
  async function setAccStatus(a: Acc) { await call(`/api/admin/accounts/${a.id}`, "PATCH", { status: a.status === "active" ? "suspended" : "active" }); refresh(); }

  const FILTERS: { k: Filter; l: string }[] = [{ k: "all", l: "Todas" }, { k: "overdue", l: `Con vencidos (${rows.filter((r) => r.overdue).length})` }, { k: "soon", l: `Por vencer (${rows.filter((r) => r.soon).length})` },
    { k: "suspended", l: "Suspendidas" }, { k: "free", l: "Con espacio libre" }];

  return (
    <div className="space-y-5">
      {toast && <div role="status" className="animate-slide-down fixed inset-x-3 top-3 z-[60] mx-auto max-w-sm rounded-xl border border-blood bg-ink/95 px-4 py-3 text-center text-sm shadow-glow">{toast}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="chip bg-blood/15 text-blood-glow">GESTIÓN</p><h1 className="title mt-2 text-3xl md:text-4xl">Cuentas y perfiles</h1></div>
        <button className="btn" onClick={() => setModal({ kind: "newAcc" })}><Plus size={18} />Nueva cuenta</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Cuentas", totals.acc], ["Clientes", totals.cli], ["Vencidos", totals.overdue], ["Perfiles libres", totals.free]].map(([k, v]) => (
          <div key={k} className={`panel p-4 ${k === "Vencidos" && Number(v) > 0 ? "border-blood/50" : ""}`}><p className="text-xs text-white/50">{k}</p><p className="title text-2xl">{v}</p></div>))}
      </div>

      <div className="panel space-y-3 p-4">
        <div className="relative"><Search size={16} className="absolute left-3 top-4 text-white/40" />
          <input className="field pl-9" placeholder="Buscar por correo, cliente o perfil…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((x) => <button key={x.k} onClick={() => setFilter(x.k)} className={`chip transition ${filter === x.k ? "bg-blood text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>{x.l}</button>)}
          <span className="ml-auto flex gap-2 text-xs"><button className="btn-ghost !px-3 !py-1.5" onClick={() => setOpen(new Set(shown.map((r) => r.a.id)))}>Abrir todas</button>
            <button className="btn-ghost !px-3 !py-1.5" onClick={() => setOpen(new Set())}>Cerrar todas</button></span>
        </div>
        <p className="text-xs text-white/40">Mostrando {shown.length} de {accounts.length} cuentas</p>
      </div>

      {accounts.length === 0 && <p className="text-white/55">Todavía no hay cuentas. Crea la primera con “Nueva cuenta”.</p>}
      {accounts.length > 0 && shown.length === 0 && <p className="text-white/55">Ninguna cuenta coincide con tu búsqueda.</p>}

      <div className="space-y-2.5">
        {shown.map(({ a, list, overdue, soon, susp }) => {
          const isOpen = open.has(a.id); const free = a.max_profiles - list.length;
          return (
            <section key={a.id} className={`panel overflow-hidden transition ${isOpen ? "border-blood/40" : ""}`}>
              {/* Fila compacta: solo el correo y lo esencial */}
              <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggle(a.id)} aria-expanded={isOpen}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blood/15 text-blood"><Mail size={19} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.email}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
                      <span>{a.label}</span><span>· {list.length}/{a.max_profiles} perfiles</span>
                      {a.status !== "active" && <span className="chip bg-blood/20 !px-2 !py-0.5 text-blood-glow">Cuenta suspendida</span>}
                      {overdue > 0 && <span className="chip bg-blood/20 !px-2 !py-0.5 text-blood-glow"><AlertTriangle size={11} />{overdue} vencido{overdue > 1 ? "s" : ""}</span>}
                      {soon > 0 && <span className="chip bg-amber-500/15 !px-2 !py-0.5 text-amber-300">{soon} por vencer</span>}
                      {susp > 0 && a.status === "active" && <span className="chip bg-white/10 !px-2 !py-0.5 text-white/60">{susp} susp.</span>}
                    </span>
                  </span>
                  <span className="hidden gap-1 sm:flex">{Array.from({ length: a.max_profiles }).map((_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${list[i] ? (list[i].status === "active" ? "bg-emerald-400" : "bg-blood") : "bg-white/15"}`} />)}</span>
                  <ChevronDown size={20} className={`shrink-0 text-white/50 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <button className="btn-ghost !px-3" onClick={() => copyLink(a.access_token)} aria-label="Copiar link de la cuenta" title="Copiar link">{copied === a.access_token ? <Check size={16} /> : <Copy size={16} />}</button>
              </div>

              {isOpen && (
                <div className="animate-pop-in space-y-4 border-t border-white/10 bg-black/20 p-3 sm:p-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button className="btn-ghost !px-3 !py-1.5" onClick={() => copyEmail(a.email)}><Copy size={14} />Copiar correo</button>
                    <a className="btn-ghost !px-3 !py-1.5" href={`/c/${a.access_token}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Abrir link</a>
                    <button className="btn-ghost !px-3 !py-1.5" onClick={() => setModal({ kind: "editAcc", acc: a })}><Pencil size={14} />Editar cuenta / contraseña</button>
                    <button className="btn-ghost !px-3 !py-1.5" onClick={() => setAccStatus(a)}>{a.status === "active" ? <><Ban size={14} />Suspender cuenta</> : <><RotateCcw size={14} />Reactivar cuenta</>}</button>
                    <span className="self-center break-all text-white/30">/c/{a.access_token}</span>
                  </div>

                  {/* Perfiles en horizontal */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {list.map((p) => (
                      <article key={p.id} className={`flex flex-col gap-2.5 rounded-2xl border bg-gradient-to-b from-white/[0.06] to-transparent p-3 ${p.status === "active" ? "border-white/10" : "border-blood/40"}`}>
                        <div className="flex items-center gap-3">
                          <Avatar k={p.avatar_key} url={p.avatar_url} size={44} />
                          <div className="min-w-0"><p className="truncate font-semibold leading-tight">{p.client_name}</p><p className="truncate text-xs text-white/45">{p.profile_name}</p></div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className={`chip !px-2 !py-0.5 ${p.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-blood/20 text-blood-glow"}`}>{p.status === "active" ? "Activo" : "Suspendido"}</span>
                          <span className={`chip !px-2 !py-0.5 ${tone(p.days)}`}>{dLabel(p.days)}</span>
                          {p.price ? <span className="chip bg-white/10 !px-2 !py-0.5 text-white/70">S/ {p.price}</span> : null}
                        </div>
                        {p.due_date && <p className="text-[11px] text-white/40">Vence {fmt(p.due_date)}</p>}
                        <div className="mt-auto grid grid-cols-4 gap-1.5">
                          <button className="btn-ghost !px-0 !py-2" onClick={() => setModal({ kind: "editPro", acc: a, pro: p })} title="Editar" aria-label="Editar cliente"><Pencil size={15} /></button>
                          <button className="btn-ghost !px-0 !py-2" onClick={() => renew(p)} title="Renovar +1 mes" aria-label="Renovar un mes"><CalendarPlus size={15} /></button>
                          <button className="btn-ghost !px-0 !py-2" onClick={() => setStatus(p)} title={p.status === "active" ? "Suspender" : "Reactivar"} aria-label={p.status === "active" ? "Suspender" : "Reactivar"}>{p.status === "active" ? <Ban size={15} /> : <RotateCcw size={15} />}</button>
                          <button className="btn-ghost !px-0 !py-2" onClick={() => remove(p)} title="Eliminar" aria-label="Eliminar perfil"><Trash2 size={15} /></button>
                        </div>
                      </article>
                    ))}
                    {Array.from({ length: Math.max(0, free) }).map((_, i) => (
                      <button key={`f${i}`} onClick={() => setModal({ kind: "addPro", acc: a })} className="flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/15 text-white/40 transition hover:border-blood/60 hover:text-white">
                        <Plus size={24} /><span className="text-xs">Perfil libre +{i + 1}</span></button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {modal?.kind === "newAcc" && <AccountModal onClose={() => setModal(null)} onDone={refresh} flash={flash} />}
      {modal?.kind === "editAcc" && <AccountModal acc={modal.acc} onClose={() => setModal(null)} onDone={refresh} flash={flash} />}
      {modal?.kind === "addPro" && <ProfileModal acc={modal.acc} onClose={() => setModal(null)} onDone={refresh} flash={flash} />}
      {modal?.kind === "editPro" && <ProfileModal acc={modal.acc} profile={modal.pro} onClose={() => setModal(null)} onDone={refresh} flash={flash} />}
    </div>
  );
}
