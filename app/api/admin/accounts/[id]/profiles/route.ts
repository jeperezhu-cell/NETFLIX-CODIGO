import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";

const schema = z.object({
  profile_name: z.string().min(1).max(40), avatar_key: z.string().max(20).default("rojo"),
  avatar_url: z.string().url().max(500).optional().or(z.literal("")),
  client_name: z.string().min(2).max(60), client_password: z.string().min(4).max(100),
  pin: z.string().regex(/^\d{4}$/, "El PIN debe tener 4 dígitos"),
  price: z.coerce.number().min(0).max(100000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(""))
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const d = p.data;
  try {
    await sql`insert into profiles (account_id, profile_name, avatar_key, avatar_url, client_name, client_login, password_hash, pin_hash, price, due_date)
      values (${id}, ${d.profile_name}, ${d.avatar_key}, ${d.avatar_url || null}, ${d.client_name}, ${d.client_name.trim().toLowerCase()},
        ${await bcrypt.hash(d.client_password, 10)}, ${await bcrypt.hash(d.pin, 10)}, ${d.price ?? null}, ${d.due_date || null})`;
  } catch (e) {
    const m = String((e as Error).message);
    if (m.includes("máximo de perfiles")) return NextResponse.json({ error: "Esta cuenta ya tiene 5 perfiles." }, { status: 409 });
    if (m.includes("unique")) return NextResponse.json({ error: "Ya existe ese cliente o ese perfil en la cuenta." }, { status: 409 });
    throw e;
  }
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'profile.create', ${JSON.stringify({ account: id, client: d.client_name })})`;
  return NextResponse.json({ ok: true });
}
