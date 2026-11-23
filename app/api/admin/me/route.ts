import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin, setSession } from "@/lib/session";
import { clientKey, tooMany, registerFail, clearFails } from "@/lib/ratelimit";

const schema = z.object({
  current_password: z.string().min(1).max(200),
  new_username: z.string().min(3).max(60).optional(),
  new_password: z.string().min(10, "La nueva contraseña debe tener al menos 10 caracteres").max(200).optional()
});

/** El administrador cambia su propio usuario y/o contraseña de inicio de sesión. */
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const d = p.data;
  if (!d.new_username && !d.new_password) return NextResponse.json({ error: "Escribe un usuario o una contraseña nueva" }, { status: 400 });

  const key = await clientKey("adminme", admin.uid);
  if (await tooMany(key, 5)) return NextResponse.json({ error: "Demasiados intentos. Espera 15 minutos." }, { status: 429 });
  const [u] = await sql`select id, username, password_hash from app_users where id=${admin.uid}`;
  if (!u || !(await bcrypt.compare(d.current_password, u.password_hash))) { await registerFail(key); return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 }); }
  await clearFails(key);

  const username = d.new_username?.trim() || u.username;
  try {
    await sql`update app_users set username=${username}, password_hash=${d.new_password ? await bcrypt.hash(d.new_password, 12) : u.password_hash} where id=${u.id}`;
  } catch (e) {
    if (String((e as Error).message).includes("unique")) return NextResponse.json({ error: "Ese usuario ya existe" }, { status: 409 });
    throw e;
  }
  await setSession("ip_admin", { role: "admin", uid: u.id, username }, 60 * 60 * 8); // sesión sigue activa con el nuevo usuario
  await sql`insert into audit_logs (actor, action, detail) values (${username}, 'admin.credentials', ${JSON.stringify({ username: !!d.new_username, password: !!d.new_password })})`;
  return NextResponse.json({ ok: true, username });
}
