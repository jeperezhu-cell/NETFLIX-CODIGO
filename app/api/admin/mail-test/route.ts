import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/session";
import { connectIcloud } from "@/lib/mail";

export const maxDuration = 30;
export async function POST() {
  if (!(await getAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const c = await connectIcloud();
    const box = await c.mailboxOpen("INBOX");
    const total = box.exists; await c.logout();
    return NextResponse.json({ ok: true, total });
  } catch { return NextResponse.json({ error: "No se pudo conectar. Revisa ICLOUD_EMAIL y la contraseña de app." }, { status: 502 }); }
}
