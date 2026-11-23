import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
export async function POST() { await clearSession("ip_admin"); return NextResponse.json({ ok: true }); }
