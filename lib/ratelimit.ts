import { headers } from "next/headers";
import { sql } from "./db";

export async function clientKey(scope: string, extra = "") {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  return `${scope}:${extra}:${ip}`;
}
export async function tooMany(key: string, max = 8) {
  const r = await sql`select count from login_attempts where key=${key} and window_start > now() - interval '15 minutes'`;
  return (r[0]?.count ?? 0) >= max;
}
export async function registerFail(key: string) {
  await sql`insert into login_attempts (key,count,window_start) values (${key},1,now())
    on conflict (key) do update set
      count = case when login_attempts.window_start > now() - interval '15 minutes' then login_attempts.count + 1 else 1 end,
      window_start = case when login_attempts.window_start > now() - interval '15 minutes' then login_attempts.window_start else now() end`;
}
export async function clearFails(key: string) { await sql`delete from login_attempts where key=${key}`; }
