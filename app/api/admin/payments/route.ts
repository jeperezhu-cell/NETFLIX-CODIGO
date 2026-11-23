import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { notifyProfile } from "@/lib/notify";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  profile_id: z.string().uuid(), amount: z.coerce.number().min(0).max(100000),
  paid_at: date, next_due: date, notes: z.string().max(500).optional(), description: z.string().max(120).optional()
});
const MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const form = await req.formData();
  const p = schema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!p.success) return NextResponse.json({ error: "Revisa los datos del pago" }, { status: 400 });
  const d = p.data;

  const file = form.get("receipt");
  let buf: Buffer | null = null;
  if (file instanceof File && file.size > 0) {
    if (!MIME.includes(file.type) || file.size > 3 * 1024 * 1024)
      return NextResponse.json({ error: "El recibo debe ser PDF/PNG/JPG/WEBP de hasta 3 MB" }, { status: 400 });
    buf = Buffer.from(await file.arrayBuffer());
  }

  const [pay] = await sql`insert into payments (profile_id, amount, paid_at, next_due, notes) values (${d.profile_id}, ${d.amount}, ${d.paid_at}, ${d.next_due}, ${d.notes ?? null}) returning id`;
  // Reactiva y mueve el vencimiento: los avisos del período anterior ya no aplican (reminder_log va por fecha).
  await sql`update profiles set due_date = ${d.next_due}, status = 'active' where id = ${d.profile_id}`;
  if (buf && file instanceof File)
    await sql`insert into receipts (profile_id, payment_id, description, filename, mime, size, data)
      values (${d.profile_id}, ${pay.id}, ${d.description || "Recibo de pago"}, ${file.name}, ${file.type}, ${file.size}, ${"\\x" + buf.toString("hex")}::bytea)`;
  await sql`insert into audit_logs (actor, action, detail) values (${admin.username}, 'payment.create', ${JSON.stringify({ profile: d.profile_id, amount: d.amount })})`;
  await notifyProfile(d.profile_id, "payment", "Pago registrado", "Hola {usuario}, registramos tu pago. Tu próximo vencimiento es el {vencimiento}. ¡Gracias!");
  return NextResponse.json({ ok: true });
}
