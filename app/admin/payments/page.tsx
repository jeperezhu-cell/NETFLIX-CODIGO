import { sql } from "@/lib/db";
import PaymentsManager from "@/components/PaymentsManager";

export default async function PaymentsPage() {
  const profiles = await sql`select pr.id, pr.client_name, pr.profile_name, pr.price::float as price, pr.due_date::text as due_date, a.label, a.email
    from profiles pr join service_accounts a on a.id = pr.account_id order by a.label, pr.created_at`;
  const payments = await sql`select p.id, pr.client_name, p.amount::float as amount, p.paid_at::text as paid_at, p.next_due::text as next_due, p.notes,
      (select id from receipts r where r.payment_id = p.id limit 1) as receipt_id
    from payments p join profiles pr on pr.id = p.profile_id order by p.created_at desc limit 40`;
  return <PaymentsManager profiles={profiles as never} payments={payments as never} />;
}
