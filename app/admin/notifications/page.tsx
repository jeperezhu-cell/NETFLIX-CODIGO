import { sql } from "@/lib/db";
import NotificationsManager from "@/components/NotificationsManager";

export default async function NotificationsPage() {
  const profiles = await sql`select pr.id, pr.client_name, pr.profile_name, pr.status, a.email,
      (pr.due_date - (now() at time zone 'America/Lima')::date)::int as days
    from profiles pr join service_accounts a on a.id = pr.account_id order by a.email, pr.created_at`;
  const history = await sql`select n.title, n.body, n.kind, n.push_sent, pr.client_name, n.created_at at time zone 'America/Lima' as at
    from notifications n join profiles pr on pr.id = n.profile_id order by n.created_at desc limit 40`;
  let pushIds: string[] = [];
  try { pushIds = (await sql`select distinct profile_id from push_subscriptions`).map((r) => r.profile_id as string); } catch { /* tabla aún no creada */ }
  return <NotificationsManager profiles={profiles as never} pushIds={pushIds} history={history.map((h) => ({ ...h, at: new Date(h.at).toISOString() })) as never} />;
}
