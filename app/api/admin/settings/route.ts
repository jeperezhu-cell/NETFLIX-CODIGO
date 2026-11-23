import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";

const schema = z.object({ title: z.string().min(1).max(120), message: z.string().min(1).max(400), phone: z.string().regex(/^\d{8,15}$/), phoneLabel: z.string().min(1).max(30) });
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "El teléfono va con código de país y solo dígitos (ej. 51986165524)" }, { status: 400 });
  await sql`insert into system_settings (key, value) values ('renew', ${JSON.stringify(p.data)}::jsonb)
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
  await sql`insert into audit_logs (actor, action) values (${admin.username}, 'settings.renew')`;
  return NextResponse.json({ ok: true });
}
