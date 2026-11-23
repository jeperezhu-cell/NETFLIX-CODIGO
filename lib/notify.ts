import * as webpush from "web-push";
import { sql } from "./db";
import { render, fmtDate } from "./templates";

const CAT = { payment: "payments", admin: "admin", general: "general" } as const;
let ready = false;
let initError = "";

/** Configura Web Push. NUNCA lanza error: si las claves están mal, simplemente no hay push (pero sí historial). */
function init() {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) { initError = "Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY y/o VAPID_PRIVATE_KEY en Vercel."; return false; }
  let subject = (process.env.VAPID_SUBJECT ?? "").trim() || "mailto:admin@itachiperu.com";
  if (!/^(mailto:|https?:\/\/)/i.test(subject)) subject = `mailto:${subject}`;
  try { webpush.setVapidDetails(subject, pub, priv); ready = true; initError = ""; }
  catch (e) { initError = `Claves VAPID inválidas: ${(e as Error).message}`; }
  return ready;
}
export function pushStatus() { const configured = init(); return { configured, error: configured ? "" : initError }; }

/** Guarda la notificación (historial) y envía Web Push a todos los dispositivos del cliente. */
export async function notifyProfile(profileId: string, kind: keyof typeof CAT, title: string, template: string) {
  const [p] = await sql`select pr.id, pr.client_name, pr.profile_name, pr.price::float as price, pr.due_date::text as due, pr.prefs,
      a.email, a.access_token from profiles pr join service_accounts a on a.id = pr.account_id where pr.id = ${profileId}`;
  if (!p) return { skipped: true, sent: 0, failed: 0, devices: 0 };
  if (p.prefs?.[CAT[kind]] === false) return { skipped: true, sent: 0, failed: 0, devices: 0 };
  const vars = { usuario: p.client_name, correo: p.email, perfil: p.profile_name, vencimiento: fmtDate(p.due),
    monto: p.price != null ? `S/ ${Number(p.price).toFixed(2)}` : "" };
  const t = render(title, vars), body = render(template, vars);

  // 1) Historial primero: aunque falle el push, el cliente lo verá dentro de su panel.
  const [n] = await sql`insert into notifications (profile_id, kind, title, body, push_sent) values (${profileId}, ${kind}, ${t}, ${body}, 0) returning id`;

  // 2) Push (en paralelo, con tiempo límite por dispositivo)
  let sent = 0, failed = 0, devices = 0;
  if (init()) {
    const subs = await sql`select id, endpoint, p256dh, auth from push_subscriptions where profile_id = ${profileId}`;
    devices = subs.length;
    const EMO = { payment: "💳", admin: "📢", general: "🔔" } as const;
    const payload = JSON.stringify({ tag: `n-${n.id}`, title: `${EMO[kind]} ${t}`, body, url: `/c/${p.access_token}/panel`, icon: "/icon-192.png" });
    const results = await Promise.allSettled(subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "high", timeout: 8000 })));
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") { sent++; continue; }
      failed++;
      const code = (r.reason as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) await sql`delete from push_subscriptions where id = ${subs[i].id}`;
    }
    if (sent > 0) await sql`update notifications set push_sent = ${sent} where id = ${n.id}`;
  }
  return { skipped: false, sent, failed, devices };
}
