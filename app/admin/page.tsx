import { sql } from "@/lib/db";
import { Network, Users, UserCheck, UserX, Clock, AlertTriangle, Receipt, Wallet, CalendarClock, Activity } from "lucide-react";

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
  const upcoming = await sql`select pr.client_name, pr.profile_name, a.label, pr.due_date::text as due,
      (pr.due_date - (now() at time zone 'America/Lima')::date)::int as d
    from profiles pr join service_accounts a on a.id = pr.account_id
    where pr.status = 'active' and pr.due_date is not null order by pr.due_date limit 7`;
  const logs = await sql`select actor, action, created_at at time zone 'America/Lima' as at from audit_logs order by id desc limit 8`;

  const cards = [
    { k: "Cuentas (links)", v: s.accounts, Icon: Network }, { k: "Clientes", v: s.clients, Icon: Users },
    { k: "Activos", v: s.active, Icon: UserCheck }, { k: "Suspendidos", v: s.suspended, Icon: UserX, bad: s.suspended > 0 },
    { k: "Vencen en 3 días", v: s.soon, Icon: Clock }, { k: "Vencidos", v: s.overdue, Icon: AlertTriangle, bad: s.overdue > 0 },
    { k: "Pagos registrados", v: s.payments, Icon: Receipt }, { k: "Ingresos", v: `S/ ${Number(s.income).toFixed(2)}`, Icon: Wallet }
  ];
  return (
    <div className="space-y-8">
      <div><p className="chip bg-blood/15 text-blood-glow">PANEL DE CONTROL</p><h1 className="title mt-2 text-4xl">Dashboard</h1></div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(({ k, v, Icon, bad }) => (
          <div key={k} className={`panel p-5 transition hover:-translate-y-1 ${bad ? "border-blood/50" : ""}`}>
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${bad ? "bg-blood text-white" : "bg-blood/15 text-blood"}`}><Icon size={20} /></span>
            <p className="mt-4 text-sm text-white/55">{k}</p>
            <p className="title mt-1 text-3xl">{String(v)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="title flex items-center gap-2 text-xl"><CalendarClock size={20} className="text-blood" />Próximos vencimientos</h2>
          {upcoming.length === 0 ? <p className="mt-3 text-sm text-white/55">Sin vencimientos cargados.</p> :
            <ul className="mt-3 divide-y divide-white/10">{upcoming.map((u, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><p className="truncate font-semibold">{u.client_name}</p><p className="truncate text-xs text-white/45">{u.label} · {u.profile_name}</p></div>
                <span className={`chip shrink-0 ${u.d < 0 ? "bg-blood/20 text-blood-glow" : u.d <= 3 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                  {u.d < 0 ? `vencido ${-u.d}d` : u.d === 0 ? "hoy" : `en ${u.d}d`} · {u.due.split("-").reverse().join("/")}</span>
              </li>))}</ul>}
        </section>
        <section className="panel p-5">
          <h2 className="title flex items-center gap-2 text-xl"><Activity size={20} className="text-blood" />Actividad reciente</h2>
          {logs.length === 0 ? <p className="mt-3 text-sm text-white/55">Aún no hay actividad.</p> :
            <ul className="mt-3 divide-y divide-white/10">{logs.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-3 text-sm"><span className="min-w-0 truncate">{l.actor} · <span className="text-white/60">{l.action}</span></span>
                <span className="shrink-0 text-xs text-white/40">{new Date(l.at).toLocaleString("es-PE")}</span></li>))}</ul>}
        </section>
      </div>
    </div>
  );
}
