import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";
import { decrypt } from "@/lib/crypto";
import { ACTIONS } from "@/lib/config";
import { getRenew } from "@/lib/settings";
import Avatar from "@/components/Avatar";
import CopyField from "@/components/CopyField";
import ActionButtons from "@/components/ActionButtons";
import LogoutButton from "@/components/LogoutButton";
import PushToggle from "@/components/PushToggle";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Panel({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await getClient();
  if (!s || s.stage !== "full" || !s.profileId) redirect(`/c/${token}`);
  const [r] = await sql`select pr.profile_name, pr.avatar_key, pr.avatar_url, pr.client_name, pr.status, pr.perms, pr.due_date::text as due_date,
      a.service, a.email, a.password_enc, a.status as acc_status
    from profiles pr join service_accounts a on a.id = pr.account_id
    where pr.id = ${s.profileId} and a.id = ${s.accountId} and a.access_token = ${token}`;
  if (!r) notFound();

  if (r.status !== "active" || r.acc_status !== "active") {
    const RENEW = await getRenew();
    return (
      <main className="grid min-h-screen place-items-center px-5 text-center">
        <div className="panel max-w-lg space-y-5 p-8">
          <h1 className="font-display text-3xl font-extrabold text-blood">{RENEW.title}</h1>
          <p className="text-lg text-white/80">{RENEW.message}</p>
          <p className="text-white/60">Contacto: {RENEW.phoneLabel}</p>
          <a href={RENEW.whatsapp} className="btn w-full">RENOVAR POR WHATSAPP</a>
          <LogoutButton token={token} />
        </div>
      </main>
    );
  }
  const perms = r.perms as Record<string, boolean>;
  const password = perms.show_password ? decrypt(r.password_enc) : null;
  const notifs = await sql`select title, body, created_at at time zone 'America/Lima' as at from notifications where profile_id = ${s.profileId} order by created_at desc limit 8`;
  const receipts = await sql`select id, coalesce(description, filename) as name, created_at at time zone 'America/Lima' as at from receipts where profile_id = ${s.profileId} order by created_at desc limit 12`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
      <header className="flex items-center gap-4">
        <Avatar k={r.avatar_key} url={r.avatar_url} size={72} />
        <div className="flex-1"><p className="text-sm text-white/55">Hola</p><h1 className="font-display text-3xl font-extrabold">{r.client_name}</h1></div>
        <LogoutButton token={token} />
      </header>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-xl font-extrabold">Tu cuenta de {r.service}</h2>
        {perms.show_email && <CopyField label="Correo" value={r.email} />}
        {password && <CopyField label="Contraseña" value={password} secret />}
        {perms.show_profile && <CopyField label="Nombre de perfil" value={r.profile_name} />}
        {r.due_date && <p className="pt-1 text-sm text-white/60">Tu suscripción vence el {r.due_date.split("-").reverse().join("/")}</p>}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-xl font-extrabold">Acciones</h2>
        <ActionButtons token={token} actions={ACTIONS.map((a) => ({ key: a.key, label: a.label, icon: a.icon, enabled: perms[a.key] === true }))} />
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-xl font-extrabold">Notificaciones</h2>
        <PushToggle token={token} vapid={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        {notifs.length === 0 ? <p className="text-sm text-white/55">Todavía no tienes avisos.</p> :
          <ul className="divide-y divide-white/10">{notifs.map((n, i) => (
            <li key={i} className="py-3"><p className="font-semibold">{n.title}</p><p className="text-sm text-white/70">{n.body}</p>
              <p className="mt-1 text-xs text-white/40">{new Date(n.at).toLocaleString("es-PE")}</p></li>))}</ul>}
      </section>

      {receipts.length > 0 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl font-extrabold">Tus recibos</h2>
          <ul className="divide-y divide-white/10">{receipts.map((x) => (
            <li key={x.id} className="flex items-center justify-between py-2 text-sm">
              <span>{x.name} <span className="text-white/40">· {new Date(x.at).toLocaleDateString("es-PE")}</span></span>
              <a className="btn-ghost" href={`/api/c/${token}/receipts/${x.id}`}><Download size={16} />Descargar</a></li>))}</ul>
        </section>
      )}
    </main>
  );
}
