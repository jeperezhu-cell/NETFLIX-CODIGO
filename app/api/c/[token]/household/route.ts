import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";
import { findForAccount } from "@/lib/mail";
import { openNetflixLink } from "@/lib/netflix-browser";
import { tooMany, registerFail } from "@/lib/ratelimit";

export const maxDuration = 60;

/**
 *  confirm → el servidor abre el link del correo y pulsa «Confirmar actualización»
 *  check   → ¿llegó el correo «Se ha confirmado tu Hogar»? (prueba real de que Netflix aceptó)
 *  getcode → el servidor abre «Obtener código» y lee el código
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const s = await getClient();
  const p = z.object({ mode: z.enum(["confirm", "check", "getcode"]) }).safeParse(await req.json().catch(() => null));
  if (!s || s.stage !== "full" || !s.profileId || !p.success) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const mode = p.data.mode;
  const permKey = mode === "getcode" ? "btn_code6" : "btn_link";

  const [r] = await sql`select pr.perms, pr.status, a.status as acc_status, a.email from profiles pr
    join service_accounts a on a.id = pr.account_id where pr.id = ${s.profileId} and a.id = ${s.accountId} and a.access_token = ${token}`;
  if (!r || r.status !== "active" || r.acc_status !== "active" || r.perms?.[permKey] === false)
    return NextResponse.json({ error: "Función no disponible" }, { status: 403 });

  const rl = `${mode === "check" ? "hhc" : "hh"}:${s.profileId}`;
  if (await tooMany(rl, mode === "check" ? 120 : 12)) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  await registerFail(rl);

  const log = (action: string, d: object) => sql`insert into audit_logs (actor, action, detail) values (${"client:" + s.profileId}, ${action}, ${JSON.stringify(d)})`;
  try {
    if (mode === "check") {
      const f = await findForAccount(r.email, "household_ok");
      return NextResponse.json({ type: f.type === "done" ? "done" : "none" });
    }
    // El enlace SIEMPRE se vuelve a leer del correo en el servidor (nunca viene del navegador del cliente).
    const found = await findForAccount(r.email, mode === "confirm" ? "btn_link" : "btn_code6");
    if (found.type !== "link") return NextResponse.json({ type: "none" });
    try {
      const out = await openNetflixLink(found.value, mode === "confirm" ? "confirm" : "getcode");
      await log(`household.${mode}`, { status: out.status, debug: out.status === "manual" ? out.debug : undefined });
      if (out.status === "done") return NextResponse.json({ type: "done", url: found.value });
      if (out.status === "code") return NextResponse.json({ type: "code", value: out.value });
      if (out.status === "expired") return NextResponse.json({ type: "expired" });
      return NextResponse.json({ type: "manual", value: found.value, debug: out.debug });
    } catch (e) {
      const msg = String((e as Error).message).slice(0, 300);
      await log("household.error", { mode, msg });
      // Plan B: el cliente lo abre desde su dispositivo. Se incluye el detalle técnico para poder corregirlo.
      return NextResponse.json({ type: "manual", value: found.value, debug: msg });
    }
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el correo. Intenta de nuevo." }, { status: 502 });
  }
}
