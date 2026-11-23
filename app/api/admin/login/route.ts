import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "@/lib/db";
import { setSession } from "@/lib/session";
import { clientKey, tooMany, registerFail, clearFails } from "@/lib/ratelimit";

const schema = z.object({ username: z.string().min(1).max(60), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const key = await clientKey("admin", p.data.username.toLowerCase());
  if (await tooMany(key)) return NextResponse.json({ error: "Demasiados intentos. Espera 15 minutos." }, { status: 429 });
  const [u] = await sql`select id, username, password_hash from app_users where lower(username)=${p.data.username.toLowerCase()} and role='admin'`;
  const ok = u ? await bcrypt.compare(p.data.password, u.password_hash) : await bcrypt.compare(p.data.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi");
  if (!u || !ok) { await registerFail(key); return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 }); }
  await clearFails(key);
  await setSession("ip_admin", { role: "admin", uid: u.id, username: u.username }, 60 * 60 * 8);
  await sql`insert into audit_logs (actor, action) values (${u.username}, 'admin.login')`;
  return NextResponse.json({ ok: true });
}
