import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, KeyRound, Wallet, Bell, Settings } from "lucide-react";
import { getAdmin } from "@/lib/session";
import AdminLogout from "@/components/AdminLogout";

export const dynamic = "force-dynamic";
const NAV = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/accounts", label: "Cuentas y perfiles", Icon: KeyRound },
  { href: "/admin/payments", label: "Pagos y recibos", Icon: Wallet },
  { href: "/admin/notifications", label: "Notificaciones", Icon: Bell },
  { href: "/admin/settings", label: "Configuración", Icon: Settings }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/");
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 bg-coal p-5 md:border-b-0 md:border-r">
        <p className="font-display text-xl font-extrabold">ITACHI <span className="text-blood">PERÚ</span></p>
        <nav className="mt-6 flex flex-wrap gap-2 md:flex-col">
          {NAV.map(({ href, label, Icon }) => <Link key={href} href={href} className="btn-ghost justify-start"><Icon size={16} />{label}</Link>)}
        </nav>
        <div className="mt-6"><AdminLogout /></div>
      </aside>
      <div className="p-5 md:p-8">{children}</div>
    </div>
  );
}
