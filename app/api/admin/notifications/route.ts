import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { notifyProfile, pushStatus } from "@/lib/notify";

export const maxDuration = 60;
const schema = z.object({ title: z.string().min(1).max(100), message: z.string().min(1).max(1000), profileIds: z.array(z.string().uuid()).min(1).max(500) });

/** Diagnóstico: ¿están bien las claves VAPID? ¿cuántos dispositivos hay suscritos? */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const st = pushStatus();
  try {
    const [r] = await sql`select count(*)::int as devices, count(distinct profile_id)::int as clients from push_subscriptions`;
    return NextResponse.json({ ...st, devices: r.devices, clients: r.clients });
  } catch {
    return NextResponse.json({ ...st, devices: 0, clients: 0, dbError: "Falta ejecutar db/migration_02.sql y db/migration_04.sql en Neon." });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const p = schema.safeParse(await req.json().catch(() => null));
    if (!p.success) return NextResponse.json({ error: "Escribe título, mensaje y elige destinatarios" }, { status: 400 });

    let delivered = 0, skipped = 0, pushed = 0, noDevice = 0, failed = 0;
    const ids = p.data.profileIds;
    for (let i = 0; i < ids.length; i += 10) {           // de 10 en 10 en paralelo: rápido y sin saturar
      const rs = await Promise.allSettled(ids.slice(i, i + 10).map((id) => notifyProfile(id, "admin", p.data.title, p.data.message)));
      for (const r of rs) {
        if (r.status === "rejected") { failed++; continue; }
        if (r.value.skipped) { skipped++; continue; }
        delivered++; pushed += r.value.sent; if (r.value.devices === 0) noDevice++;
      }
    }
    await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'notification.send', ${JSON.stringify({ delivered, skipped, pushed, noDevice, failed })})`;
    return NextResponse.json({ ok: true, delivered, skipped, pushed, noDevice, failed, push: pushStatus() });
  } catch (e) {
    const m = String((e as Error).message ?? e);
    const hint = /relation .* does not exist|column .* does not exist/i.test(m) ? "Faltan tablas en Neon: ejecuta db/migration_02.sql y db/migration_04.sql." : m.slice(0, 160);
    return NextResponse.json({ error: `No se pudo enviar. ${hint}` }, { status: 500 });
  }
}
