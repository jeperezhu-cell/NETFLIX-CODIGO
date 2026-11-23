import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { notifyProfile } from "@/lib/notify";
import { REMINDERS } from "@/lib/templates";

export const maxDuration = 60;

// Vercel Cron envía "Authorization: Bearer $CRON_SECRET". Zona horaria de negocio: America/Lima.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // diff = vencimiento - hoy (Lima): 2 aviso previo · 0 vence hoy · -1 tolerancia 1 · -2 tolerancia 2 · <=-3 suspender
  const rows = await sql`select pr.id, pr.due_date::text as due,
      (pr.due_date - (now() at time zone 'America/Lima')::date)::int as diff
    from profiles pr join service_accounts a on a.id = pr.account_id
    where pr.status = 'active' and a.status = 'active' and pr.due_date is not null
      and (pr.due_date - (now() at time zone 'America/Lima')::date) <= 2`;

  const summary = { pre: 0, due: 0, tol1: 0, tol2: 0, suspend: 0 };
  for (const r of rows) {
    const kind = r.diff === 2 ? "pre" : r.diff === 0 ? "due" : r.diff === -1 ? "tol1" : r.diff === -2 ? "tol2" : r.diff <= -3 ? "suspend" : null;
    if (!kind) continue;
    if (kind === "suspend") await sql`update profiles set status = 'suspended' where id = ${r.id}`;
    const fresh = await sql`insert into reminder_log (profile_id, due_date, kind) values (${r.id}, ${r.due}, ${kind}) on conflict do nothing returning kind`;
    if (fresh.length === 0) continue; // ya se envió: sin duplicados
    await notifyProfile(r.id, "payment", REMINDERS[kind].title, REMINDERS[kind].body);
    summary[kind]++;
  }
  await sql`insert into audit_logs (actor, action, detail) values ('cron', 'cron.daily', ${JSON.stringify(summary)})`;
  return NextResponse.json({ ok: true, ...summary });
}
