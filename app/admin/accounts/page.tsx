import { sql } from "@/lib/db";
import AccountsManager from "@/components/AccountsManager";

export default async function AccountsPage() {
  const accounts = await sql`select id, label, service, email, access_token, max_profiles from service_accounts order by created_at desc`;
  const profiles = await sql`select id, account_id, profile_name, avatar_key, avatar_url, client_name, status, price::float as price, due_date::text as due_date from profiles order by created_at`;
  return <AccountsManager accounts={accounts as never} profiles={profiles as never} />;
}
