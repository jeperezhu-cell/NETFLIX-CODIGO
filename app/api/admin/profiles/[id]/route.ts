import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/crypto";
import { notifyProfile } from "@/lib/notify";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  action: z.literal("renew").optional(),
  status: z.enum(["active", "suspended"]).optional(),
  profile_name: z.string().min(1).max(40).optional(),
  client_name: z.string().min(2).max(60).optional(),
  client_password: z.string().min(4).max(100).optional(),
  pin: z.string().regex(/^\d{4}$/, "El PIN debe tener 4 dígitos").optional(),
  avatar_key: z.string().max(20).optional(),
  avatar_url: z.string().url().max(500).or(z.literal("")).nullable().optional(),
  price: z.number().min(0).max(100000).nullable().optional(),
  due_date: date.or(z.literal("")).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  perms: z.record(z.boolean()).optional()
});

/** Credenciales del cliente (descifradas) para que el administrador las vea al editar. */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const [r] = await sql`select client_password_enc, pin_enc from profiles where id=${id}`;
  const dec = (v?: string | null) => { try { return v ? decrypt(v) : null; } catch { return null; } };
  return NextResponse.json({ client_password: dec(r?.client_password_enc), pin: dec(r?.pin_enc) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const d = p.data;

  // Renovar: +1 mes desde el vencimiento (o desde hoy si ya venció), reactiva y registra el pago
  if (d.action === "renew") {
    const [u] = await sql`update profiles set status='active',
        due_date = (greatest(coalesce(due_date, (now() at time zone 'America/Lima')::date), (now() at time zone 'America/Lima')::date) + interval '1 month')::date
      where id=${id} returning due_date::text as due, price::float as price`;
    if (!u) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    await sql`insert into payments (profile_id, amount, next_due, notes) values (${id}, ${u.price ?? 0}, ${u.due}, 'Renovación rápida')`;
    await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'profile.renew', ${JSON.stringify({ id, due: u.due })})`;
    try { await notifyProfile(id, "payment", "Pago registrado", "Hola {usuario}, registramos tu pago. Tu próximo vencimiento es el {vencimiento}. ¡Gracias!"); } catch { /* el aviso es opcional */ }
    return NextResponse.json({ ok: true, due: u.due });
  }

  const [cur] = await sql`select * from profiles where id=${id}`;
  if (!cur) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const clientName = d.client_name ?? cur.client_name;
  const perms = d.perms ? { ...cur.perms, ...d.perms } : cur.perms;
  const hash = d.client_password ? await bcrypt.hash(d.client_password, 10) : null;
  const pinHash = d.pin ? await bcrypt.hash(d.pin, 10) : null;
  const pwEnc = d.client_password ? encrypt(d.client_password) : null;
  const pinEnc = d.pin ? encrypt(d.pin) : null;
  const dueDate = d.due_date === undefined ? cur.due_date : d.due_date || null;
  try {
    await sql`update profiles set
        status = ${d.status ?? cur.status},
        profile_name = ${d.profile_name ?? cur.profile_name},
        client_name = ${clientName}, client_login = ${clientName.trim().toLowerCase()},
        avatar_key = ${d.avatar_key ?? cur.avatar_key},
        avatar_url = ${d.avatar_url === undefined ? cur.avatar_url : d.avatar_url || null},
        price = ${d.price === undefined ? cur.price : d.price},
        due_date = ${dueDate},
        notes = ${d.notes === undefined ? cur.notes : d.notes},
        perms = ${JSON.stringify(perms)}::jsonb,
        password_hash = coalesce(${hash}, password_hash), client_password_enc = coalesce(${pwEnc}, client_password_enc),
        pin_hash = coalesce(${pinHash}, pin_hash), pin_enc = coalesce(${pinEnc}, pin_enc)
      where id=${id}`;
  } catch (e) {
    if (String((e as Error).message).includes("unique")) return NextResponse.json({ error: "Ya existe ese nombre de cliente o ese perfil en la cuenta." }, { status: 409 });
    throw e;
  }
  const changed = Object.keys(d).filter((k) => k !== "client_password" && k !== "pin");
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'profile.update', ${JSON.stringify({ id, changed, password: !!d.client_password, pin: !!d.pin })})`;
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
