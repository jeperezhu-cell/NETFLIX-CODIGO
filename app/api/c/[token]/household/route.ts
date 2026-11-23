import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";
import { findForAccount } from "@/lib/mail";
import { openNetflixLink } from "@/lib/netflix-browser";
import { tooMany, registerFail } from "@/lib/ratelimit";

export const maxDuration = 60;

/** El cliente pulsa "ACTUALIZAR HOGAR": el servidor busca el link en el correo, lo abre y pulsa el botón de Netflix. */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const s = await getClient();
  const p = z.object({ mode: z.enum(["confirm", "getcode"]) }).safeParse(await req.json().catch(() => null));
  if (!s || s.stage !== "full" || !s.profileId || !p.success) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const key = p.data.mode === "confirm" ? "btn_link" : "btn_code6";

  const [r] = await sql`select pr.perms, pr.status, a.status as acc_status, a.email from profiles pr
    join service_accounts a on a.id = pr.account_id where pr.id = ${s.profileId} and a.id = ${s.accountId} and a.access_token = ${token}`;
  if (!r || r.status !== "active" || r.acc_status !== "active" || r.perms?.[key] === false)
    return NextResponse.json({ error: "Función no disponible" }, { status: 403 });

  const rl = `hh:${s.profileId}`;
  if (await tooMany(rl, 10)) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  await registerFail(rl);

  try {
    // El enlace SIEMPRE se vuelve a leer del correo en el servidor (nunca viene del navegador del cliente).
    const found = await findForAccount(r.email, key);
    if (found.type !== "link") return NextResponse.json({ type: "none" });
    const out = await openNetflixLink(found.value, p.data.mode);
    await sql`insert into audit_logs (actor, action, detail) values (${"client:" + s.profileId}, 'household.run',
      ${JSON.stringify({ mode: p.data.mode, status: out.status, debug: out.status === "manual" ? out.debug : undefined })})`;
    // Si el navegador automático no pudo, se ofrece el enlace como plan B (solo en ese caso).
    if (out.status === "manual") return NextResponse.json({ type: "manual", value: found.value });
    return NextResponse.json({ type: out.status, value: out.status === "code" ? out.value : undefined });
  } catch (e) {
    await sql`insert into audit_logs (actor, action, detail) values (${"client:" + s.profileId}, 'household.error', ${JSON.stringify({ msg: String((e as Error).message).slice(0, 200) })})`;
    return NextResponse.json({ error: "No se pudo completar automáticamente. Intenta de nuevo." }, { status: 502 });
  }
}
