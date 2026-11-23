import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getClient } from "@/lib/session";
import ClientFlow from "@/components/ClientFlow";

export const dynamic = "force-dynamic";

export default async function ClientEntry({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [acc] = await sql`select id, label from service_accounts where access_token=${token}`;
  if (!acc) notFound();
  const s = await getClient();
  if (s && s.accountId === acc.id) {
    if (s.stage === "full") redirect(`/c/${token}/panel`);
    const profiles = await sql`select id, profile_name, avatar_key, avatar_url from profiles where id = any(${s.profileIds}::uuid[]) order by created_at`;
    return <ClientFlow token={token} label={acc.label} initialStage="choose" initialProfiles={profiles as never} />;
  }
  return <ClientFlow token={token} label={acc.label} initialStage="login" initialProfiles={[]} />;
}
