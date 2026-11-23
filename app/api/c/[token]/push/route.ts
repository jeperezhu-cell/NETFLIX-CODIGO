import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";

const schema = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });
export async function POST(req: Request) {
  const s = await getClient();
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!s || s.stage !== "full" || !s.profileId || !p.success) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await sql`insert into push_subscriptions (profile_id, endpoint, p256dh, auth) values (${s.profileId}, ${p.data.endpoint}, ${p.data.keys.p256dh}, ${p.data.keys.auth})
    on conflict (endpoint) do update set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth`;
  return NextResponse.json({ ok: true });
}
