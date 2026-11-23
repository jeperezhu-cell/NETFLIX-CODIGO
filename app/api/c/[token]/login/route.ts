import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "@/lib/db";
import { setSession } from "@/lib/session";
import { clientKey, tooMany, registerFail, clearFails } from "@/lib/ratelimit";

const schema = z.object({ name: z.string().min(1).max(60), password: z.string().min(1).max(100) });

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Escribe tu nombre y contraseña" }, { status: 400 });
  const key = await clientKey("client", token.slice(0, 8));
  if (await tooMany(key)) return NextResponse.json({ error: "Demasiados intentos. Espera 15 minutos." }, { status: 429 });

  const [acc] = await sql`select id from service_accounts where access_token=${token}`;
  const rows = acc ? await sql`select id, profile_name, avatar_key, avatar_url, password_hash from profiles
    where account_id=${acc.id} and client_login=${p.data.name.trim().toLowerCase()}` : [];
  const mine = [];
  for (const r of rows) if (await bcrypt.compare(p.data.password, r.password_hash)) mine.push(r);
  if (!acc || mine.length === 0) { await registerFail(key); return NextResponse.json({ error: "Nombre o contraseña incorrectos" }, { status: 401 }); }

  await clearFails(key);
  await setSession("ip_client", { role: "client", accountId: acc.id, profileIds: mine.map((m) => m.id), stage: "choose" }, 60 * 60 * 12);
  return NextResponse.json({ profiles: mine.map(({ id, profile_name, avatar_key, avatar_url }) => ({ id, profile_name, avatar_key, avatar_url })) });
}
