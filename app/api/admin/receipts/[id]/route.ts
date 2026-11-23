import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";

const ok = (id: string) => /^[0-9a-f-]{36}$/.test(id);
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await getAdmin()) || !ok(id)) return new NextResponse("No autorizado", { status: 401 });
  const [r] = await sql`select filename, mime, encode(data,'base64') as b64 from receipts where id = ${id}`;
  if (!r) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(Buffer.from(r.b64, "base64"), { headers: { "content-type": r.mime, "content-disposition": `inline; filename="${encodeURIComponent(r.filename)}"`, "cache-control": "private, no-store" } });
}
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  const { id } = await ctx.params;
  if (!admin || !ok(id)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await sql`delete from receipts where id = ${id}`;
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'receipt.delete', ${JSON.stringify({ id })})`;
  return NextResponse.json({ ok: true });
}
