"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KeyRound, Wallet, Bell, Settings } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", short: "Inicio", Icon: LayoutDashboard },
  { href: "/admin/accounts", label: "Cuentas y perfiles", short: "Cuentas", Icon: KeyRound },
  { href: "/admin/payments", label: "Pagos y recibos", short: "Pagos", Icon: Wallet },
  { href: "/admin/notifications", label: "Notificaciones", short: "Avisos", Icon: Bell },
  { href: "/admin/settings", label: "Configuración", short: "Ajustes", Icon: Settings }
];

export default function AdminNav({ variant }: { variant: "side" | "bottom" }) {
  const path = usePathname();
  const active = (h: string) => (h === "/admin" ? path === h : path.startsWith(h));
  if (variant === "bottom")
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-ink/95 backdrop-blur md:hidden">
        {NAV.map(({ href, short, Icon }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active(href) ? "text-blood-glow" : "text-white/55"}`}>
            <Icon size={20} />{short}
          </Link>
        ))}
      </nav>
    );
  return (
    <nav className="mt-8 flex flex-col gap-1.5">
      {NAV.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${active(href) ? "bg-gradient-to-r from-blood/25 to-transparent text-white shadow-[inset_3px_0_0_#e10613]" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
          <Icon size={18} className={active(href) ? "text-blood-glow" : ""} />{label}
        </Link>
      ))}
    </nav>
  );
}
