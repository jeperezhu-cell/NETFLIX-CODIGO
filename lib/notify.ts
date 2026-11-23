import * as webpush from "web-push";
import { sql } from "./db";
import { render, fmtDate } from "./templates";

const CAT = { payment: "payments", admin: "admin", general: "general" } as const;
let ready = false;
function init() {
  if (ready) return true;
  const { VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_SUBJECT || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return (ready = true);
}

/** Guarda la notificación (historial) y envía Web Push si el cliente lo permite. */
export async function notifyProfile(profileId: string, kind: keyof typeof CAT, title: string, template: string) {
  const [p] = await sql`select pr.id, pr.client_name, pr.profile_name, pr.price::float as price, pr.due_date::text as due, pr.prefs,
      a.email, a.access_token from profiles pr join service_accounts a on a.id = pr.account_id where pr.id = ${profileId}`;
  if (!p) return { skipped: true, sent: 0 };
  if (p.prefs?.[CAT[kind]] === false) return { skipped: true, sent: 0 };
  const vars = { usuario: p.client_name, correo: p.email, perfil: p.profile_name, vencimiento: fmtDate(p.due),
    monto: p.price != null ? `S/ ${Number(p.price).toFixed(2)}` : "" };
  const t = render(title, vars), body = render(template, vars);

  let sent = 0;
  if (init()) {
    const subs = await sql`select id, endpoint, p256dh, auth from push_subscriptions where profile_id = ${profileId}`;
    const payload = JSON.stringify({ title: t, body, url: `/c/${p.access_token}/panel`, icon: "/icon-192.png" });
    for (const s of subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); sent++; }
      catch (e) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await sql`delete from push_subscriptions where id = ${s.id}`; }
    }
  }
  await sql`insert into notifications (profile_id, kind, title, body, push_sent) values (${profileId}, ${kind}, ${t}, ${body}, ${sent})`;
  return { skipped: false, sent };
}
