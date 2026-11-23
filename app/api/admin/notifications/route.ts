import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { notifyProfile } from "@/lib/notify";

export const maxDuration = 60;
const schema = z.object({ title: z.string().min(1).max(100), message: z.string().min(1).max(1000), profileIds: z.array(z.string().uuid()).min(1).max(500) });

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Escribe título, mensaje y elige destinatarios" }, { status: 400 });
  let delivered = 0, skipped = 0, pushed = 0;
  for (const id of p.data.profileIds) {
    const r = await notifyProfile(id, "admin", p.data.title, p.data.message);
    if (r.skipped) skipped++; else { delivered++; pushed += r.sent; }
  }
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'notification.send', ${JSON.stringify({ delivered, skipped, pushed })})`;
  return NextResponse.json({ ok: true, delivered, skipped, pushed });
}
