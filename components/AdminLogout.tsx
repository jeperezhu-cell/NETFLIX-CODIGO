"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
export default function AdminLogout() {
  const router = useRouter();
  return <button className="btn-ghost w-full" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); router.push("/"); router.refresh(); }}><LogOut size={16} />Cerrar sesión</button>;
}
