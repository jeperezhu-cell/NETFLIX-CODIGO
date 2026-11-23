import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";
import { ACTIONS } from "@/lib/config";
import { findForAccount } from "@/lib/mail";
import { tooMany, registerFail } from "@/lib/ratelimit";

export const maxDuration = 30;

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const s = await getClient();
  const p = z.object({ key: z.string() }).safeParse(await req.json().catch(() => null));
  const action = ACTIONS.find((a) => a.key === (p.success ? p.data.key : ""));
  if (!s || s.stage !== "full" || !s.profileId || !action) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [r] = await sql`select pr.perms, pr.status, a.status as acc_status, a.email from profiles pr
    join service_accounts a on a.id = pr.account_id where pr.id = ${s.profileId} and a.id = ${s.accountId} and a.access_token = ${token}`;
  if (!r || r.status !== "active" || r.acc_status !== "active" || r.perms?.[action.key] === false)
    return NextResponse.json({ error: "Función no disponible" }, { status: 403 });

  const key = `mail:${s.profileId}`;
  if (await tooMany(key, 40)) return NextResponse.json({ error: "Demasiadas consultas. Intenta en unos minutos." }, { status: 429 });
  await registerFail(key); // cuenta cada consulta

  try {
    const found = await findForAccount(r.email, action.key);
    await sql`insert into audit_logs (actor, action, detail) values (${"client:" + s.profileId}, 'mail.lookup', ${JSON.stringify({ key: action.key, result: found.type })})`;
    // LINK HOGAR: la confirmación debe hacerse desde la RED DEL CLIENTE (su IP), por eso el link se abre en SU dispositivo.
    // No se muestra como texto: solo se entrega al botón "PRESIONA PARA ACTUALIZAR HOGAR".
    if (found.type === "link" && action.key === "btn_link") return NextResponse.json({ type: "ready", mode: "confirm", url: found.value, at: found.at });
    // CÓDIGO HOGAR (6): el servidor abre el enlace y lee el código; el cliente no ve el link.
    if (found.type === "link") return NextResponse.json({ type: "ready", mode: "getcode", at: found.at });
    return NextResponse.json(found);
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el correo. Intenta de nuevo." }, { status: 502 });
  }
}
