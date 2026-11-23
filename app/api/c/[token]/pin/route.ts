import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getClient, setSession } from "@/lib/session";
import { clientKey, tooMany, registerFail, clearFails } from "@/lib/ratelimit";

const schema = z.object({ profileId: z.string().uuid(), pin: z.string().regex(/^\d{4}$/) });

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const s = await getClient();
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!s || !p.success) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  const key = await clientKey("pin", p.data.profileId);
  if (await tooMany(key, 5)) return NextResponse.json({ error: "PIN bloqueado 15 minutos por intentos fallidos." }, { status: 429 });
  // El perfil debe pertenecer a la cuenta de este link (el join lo garantiza)
  const [row] = await sql`select pr.pin_hash from profiles pr join service_accounts a on a.id=pr.account_id
    where pr.id=${p.data.profileId} and a.id=${s.accountId} and a.access_token=${token}`;
  if (!row || !(await bcrypt.compare(p.data.pin, row.pin_hash))) { await registerFail(key); return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 }); }
  await clearFails(key);
  await setSession("ip_client", { ...s, stage: "full", profileId: p.data.profileId }, 60 * 60 * 12);
  return NextResponse.json({ ok: true });
}
