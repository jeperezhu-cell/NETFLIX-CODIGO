import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";
import { decrypt } from "@/lib/crypto";
import { ACTIONS } from "@/lib/config";
import { getRenew } from "@/lib/settings";
import { ago } from "@/lib/time";
import Avatar from "@/components/Avatar";
import CopyField from "@/components/CopyField";
import ActionButtons from "@/components/ActionButtons";
import LogoutButton from "@/components/LogoutButton";
import PushToggle from "@/components/PushToggle";
import Sharingan from "@/components/Sharingan";
import { Download, Bell, Wallet, Megaphone, FileText, CalendarClock, KeyRound, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Panel({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await getClient();
  if (!s || s.stage !== "full" || !s.profileId) redirect(`/c/${token}`);
  const [r] = await sql`select pr.profile_name, pr.avatar_key, pr.avatar_url, pr.client_name, pr.status, pr.perms, pr.due_date::text as due_date,
      (pr.due_date - (now() at time zone 'America/Lima')::date)::int as days_left,
      a.service, a.email, a.password_enc, a.status as acc_status
    from profiles pr join service_accounts a on a.id = pr.account_id
    where pr.id = ${s.profileId} and a.id = ${s.accountId} and a.access_token = ${token}`;
  if (!r) notFound();

  if (r.status !== "active" || r.acc_status !== "active") {
    const RENEW = await getRenew();
    return (
      <main className="grid min-h-screen place-items-center px-5 text-center">
        <div className="panel animate-pop-in max-w-lg space-y-5 border-blood/50 p-9 shadow-glow">
          <Sharingan className="mx-auto h-20 w-20 animate-spin-slow" />
          <h1 className="title text-3xl text-blood-glow">{RENEW.title}</h1>
          <p className="text-lg text-white/80">{RENEW.message}</p>
          <p className="text-white/55">Contacto: {RENEW.phoneLabel}</p>
          <a href={RENEW.whatsapp} className="btn w-full !py-4 text-lg">RENOVAR POR WHATSAPP</a>
          <LogoutButton token={token} />
        </div>
      </main>
    );
  }
  const perms = r.perms as Record<string, boolean>;
  const password = perms.show_password ? decrypt(r.password_enc) : null;
  const notifs = await sql`select kind, title, body, extract(epoch from now() - created_at)::int as secs from notifications where profile_id = ${s.profileId} order by created_at desc limit 8`;
  const receipts = await sql`select id, coalesce(description, filename) as name, created_at at time zone 'America/Lima' as at from receipts where profile_id = ${s.profileId} order by created_at desc limit 12`;

  const d = r.days_left as number | null;
  const tone = d === null ? "" : d < 0 ? "bg-blood/20 text-blood-glow" : d <= 3 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300";
  const dLabel = d === null ? "" : d < 0 ? `Venció hace ${-d} día${d === -1 ? "" : "s"}` : d === 0 ? "Vence hoy" : `Vence en ${d} día${d === 1 ? "" : "s"}`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:py-12">
      <section className="panel animate-pop-in relative overflow-hidden p-6">
        <Sharingan className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-spin-slow opacity-[0.07]" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="rounded-xl shadow-glow"><Avatar k={r.avatar_key} url={r.avatar_url} size={84} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Bienvenido</p>
            <h1 className="title truncate text-3xl md:text-4xl">{r.client_name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="chip bg-emerald-500/15 text-emerald-300"><Zap size={13} />Activo</span>
              {r.due_date && <span className={`chip ${tone}`}><CalendarClock size={13} />{dLabel} · {r.due_date.split("-").reverse().join("/")}</span>}
            </div>
          </div>
          <LogoutButton token={token} />
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="title flex items-center gap-2 text-xl"><KeyRound size={20} className="text-blood" />Tu cuenta de {r.service}</h2>
        {perms.show_email && <CopyField label="Correo" value={r.email} />}
        {password && <CopyField label="Contraseña" value={password} secret />}
        {perms.show_profile && <CopyField label="Nombre de perfil" value={r.profile_name} />}
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="title flex items-center gap-2 text-xl"><Zap size={20} className="text-blood" />Códigos y accesos</h2>
        <ActionButtons token={token} actions={ACTIONS.map((a) => ({ key: a.key, label: a.label, icon: a.icon, enabled: perms[a.key] !== false }))} />
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="title flex items-center gap-2 text-xl"><Bell size={20} className="text-blood" />Notificaciones</h2>
        <PushToggle token={token} vapid={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        {notifs.length === 0 ? <p className="text-sm text-white/55">Todavía no tienes avisos.</p> :
          <ul className="space-y-3">{notifs.map((n, i) => {
            const pay = n.kind === "payment"; const fresh = n.secs < 86400;
            return (
              <li key={i} className={`flex gap-3 rounded-2xl border p-4 ${fresh ? "border-blood/50 bg-blood/[0.07]" : "border-white/10 bg-black/30"}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${pay ? "bg-blood text-white" : "bg-white/10 text-white"}`}>{pay ? <Wallet size={20} /> : <Megaphone size={20} />}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{n.title}</p>
                    {fresh && <span className="chip bg-blood px-2 py-0.5 text-[10px] text-white">NUEVO</span>}</div>
                  <p className="mt-1 text-sm text-white/70">{n.body}</p>
                  <p className="mt-2 text-xs text-white/40">{pay ? "Pago" : "Aviso"} · {ago(n.secs)}</p>
                </div>
              </li>);
          })}</ul>}
      </section>

      {receipts.length > 0 && (
        <section className="panel space-y-3 p-5">
          <h2 className="title flex items-center gap-2 text-xl"><FileText size={20} className="text-blood" />Tus recibos</h2>
          <ul className="divide-y divide-white/10">{receipts.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>{x.name} <span className="text-white/40">· {new Date(x.at).toLocaleDateString("es-PE")}</span></span>
              <a className="btn-ghost" href={`/api/c/${token}/receipts/${x.id}`}><Download size={16} />Descargar</a></li>))}</ul>
        </section>
      )}
    </main>
  );
}
