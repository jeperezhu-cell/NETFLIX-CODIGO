import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";
import { findForAccount } from "@/lib/mail";
import { openNetflixLink } from "@/lib/netflix-browser";
import { tooMany, registerFail } from "@/lib/ratelimit";

export const maxDuration = 60;

/**
 *  mode "check"   → ¿Netflix ya envió el correo "Se ha confirmado tu Hogar"? (el cliente confirmó desde SU red)
 *  mode "getcode" → el servidor abre el enlace "Obtener código" y lee el código (no depende de la IP del cliente)
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const s = await getClient();
  const p = z.object({ mode: z.enum(["check", "getcode"]) }).safeParse(await req.json().catch(() => null));
  if (!s || s.stage !== "full" || !s.profileId || !p.success) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const permKey = p.data.mode === "check" ? "btn_link" : "btn_code6";

  const [r] = await sql`select pr.perms, pr.status, a.status as acc_status, a.email from profiles pr
    join service_accounts a on a.id = pr.account_id where pr.id = ${s.profileId} and a.id = ${s.accountId} and a.access_token = ${token}`;
  if (!r || r.status !== "active" || r.acc_status !== "active" || r.perms?.[permKey] === false)
    return NextResponse.json({ error: "Función no disponible" }, { status: 403 });

  const rl = `${p.data.mode === "check" ? "hhc" : "hh"}:${s.profileId}`;
  if (await tooMany(rl, p.data.mode === "check" ? 120 : 10)) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  await registerFail(rl);

  try {
    if (p.data.mode === "check") {
      const f = await findForAccount(r.email, "household_ok");
      return NextResponse.json({ type: f.type === "done" ? "done" : "none" });
    }
    // El enlace SIEMPRE se vuelve a leer del correo en el servidor (nunca viene del navegador del cliente).
    const found = await findForAccount(r.email, "btn_code6");
    if (found.type !== "link") return NextResponse.json({ type: "none" });
    try {
      const out = await openNetflixLink(found.value, "getcode");
      await sql`insert into audit_logs (actor, action, detail) values (${"client:" + s.profileId}, 'household.getcode', ${JSON.stringify({ status: out.status, debug: out.status === "manual" ? out.debug : undefined })})`;
      if (out.status === "code") return NextResponse.json({ type: "code", value: out.value });
      if (out.status === "expired") return NextResponse.json({ type: "expired" });
    } catch (e) {
      await sql`insert into audit_logs (actor, action, detail) values (${"client:" + s.profileId}, 'household.error', ${JSON.stringify({ msg: String((e as Error).message).slice(0, 300) })})`;
    }
    // Plan B: si el navegador automático falla, el cliente lo abre desde su dispositivo
    return NextResponse.json({ type: "manual", value: found.value });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el correo. Intenta de nuevo." }, { status: 502 });
  }
}
