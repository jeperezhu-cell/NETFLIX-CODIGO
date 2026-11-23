import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/crypto";

const schema = z.object({
  label: z.string().min(1).max(80).optional(), service: z.string().min(1).max(40).optional(),
  email: z.string().email().max(120).optional(), password: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "suspended"]).optional(), notes: z.string().max(500).nullable().optional(),
  regenerate_link: z.boolean().optional()
});

/** Contraseña de la cuenta de Netflix (descifrada) solo para el administrador. */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const [r] = await sql`select password_enc from service_accounts where id=${id}`;
  if (!r) return NextResponse.json({ error: "No existe" }, { status: 404 });
  try { return NextResponse.json({ password: decrypt(r.password_enc) }); } catch { return NextResponse.json({ password: null }); }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Revisa los datos de la cuenta" }, { status: 400 });
  const d = p.data;
  const [cur] = await sql`select * from service_accounts where id=${id}`;
  if (!cur) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const token = d.regenerate_link ? randomBytes(18).toString("base64url") : cur.access_token;
  await sql`update service_accounts set
      label = ${d.label ?? cur.label}, service = ${d.service ?? cur.service}, email = ${(d.email ?? cur.email).toLowerCase()},
      password_enc = ${d.password ? encrypt(d.password) : cur.password_enc}, status = ${d.status ?? cur.status},
      notes = ${d.notes === undefined ? cur.notes : d.notes}, access_token = ${token}
    where id=${id}`;
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'account.update', ${JSON.stringify({ id, changed: Object.keys(d).filter((k) => k !== "password"), password: !!d.password })})`;
  return NextResponse.json({ ok: true, token });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  await sql`delete from service_accounts where id=${id}`;
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'account.delete', ${JSON.stringify({ id })})`;
  return NextResponse.json({ ok: true });
}
