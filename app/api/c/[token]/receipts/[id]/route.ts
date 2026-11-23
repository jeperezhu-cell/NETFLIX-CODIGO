import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";

export async function GET(_: Request, ctx: { params: Promise<{ token: string; id: string }> }) {
  const { id } = await ctx.params;
  const s = await getClient();
  if (!s || s.stage !== "full" || !s.profileId || !/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("No autorizado", { status: 401 });
  const [r] = await sql`select filename, mime, encode(data,'base64') as b64 from receipts where id = ${id} and profile_id = ${s.profileId}`;
  if (!r) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(Buffer.from(r.b64, "base64"), { headers: {
    "content-type": r.mime, "content-disposition": `attachment; filename="${encodeURIComponent(r.filename)}"`, "cache-control": "private, no-store" } });
}
