import { sql, LIMA_TODAY } from "@/lib/db";

export default async function Dashboard() {
  const [s] = await sql`select
    (select count(*) from service_accounts)::int as accounts,
    (select count(*) from profiles)::int as clients,
    (select count(*) from profiles where status='active')::int as active,
    (select count(*) from profiles where status='suspended')::int as suspended,
    (select count(*) from profiles where status='active' and due_date between (now() at time zone 'America/Lima')::date and (now() at time zone 'America/Lima')::date + 3)::int as soon,
    (select count(*) from profiles where status='active' and due_date < (now() at time zone 'America/Lima')::date)::int as overdue,
    (select coalesce(sum(amount),0) from payments)::float as income,
    (select count(*) from payments)::int as payments`;
  const logs = await sql`select actor, action, created_at at time zone 'America/Lima' as at from audit_logs order by id desc limit 8`;
  const cards = [
    ["Cuentas (links)", s.accounts], ["Clientes", s.clients], ["Activos", s.active], ["Suspendidos", s.suspended],
    ["Vencen en 3 días", s.soon], ["Vencidos", s.overdue], ["Pagos registrados", s.payments], ["Ingresos", `S/ ${Number(s.income).toFixed(2)}`]
  ];
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([k, v]) => (
          <div key={String(k)} className="panel p-5">
            <p className="text-sm text-white/55">{k}</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{String(v)}</p>
          </div>
        ))}
      </div>
      <section className="panel p-5">
        <h2 className="font-display text-xl font-extrabold">Actividad reciente</h2>
        {logs.length === 0 ? <p className="mt-3 text-white/55">Aún no hay actividad. Crea tu primera cuenta en “Cuentas y perfiles”.</p> :
          <ul className="mt-3 divide-y divide-white/10">{logs.map((l, i) => (
            <li key={i} className="flex justify-between py-2 text-sm"><span>{l.actor} · {l.action}</span><span className="text-white/50">{new Date(l.at).toLocaleString("es-PE")}</span></li>
          ))}</ul>}
      </section>
    </div>
  );
}
