import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { encrypt } from "@/lib/crypto";

const schema = z.object({
  label: z.string().min(1).max(80), service: z.string().min(1).max(40).default("Netflix"),
  email: z.string().email().max(120), password: z.string().min(1).max(200)
});

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Revisa los datos del formulario" }, { status: 400 });
  const token = randomBytes(18).toString("base64url");
  const [row] = await sql`insert into service_accounts (label, service, email, password_enc, access_token)
    values (${p.data.label}, ${p.data.service}, ${p.data.email.toLowerCase()}, ${encrypt(p.data.password)}, ${token}) returning id`;
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'account.create', ${JSON.stringify({ id: row.id })})`;
  return NextResponse.json({ ok: true, id: row.id, token });
}
