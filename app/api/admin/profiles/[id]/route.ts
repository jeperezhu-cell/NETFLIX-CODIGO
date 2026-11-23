import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const p = z.object({ status: z.enum(["active", "suspended"]) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  await sql`update profiles set status=${p.data.status} where id=${id}`;
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'profile.status', ${JSON.stringify({ id, status: p.data.status })})`;
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  await sql`delete from profiles where id=${id}`;
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'profile.delete', ${JSON.stringify({ id })})`;
  return NextResponse.json({ ok: true });
}
