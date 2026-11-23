"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
export default function LogoutButton({ token }: { token: string }) {
  const router = useRouter();
  return (
    <button className="btn-ghost" onClick={async () => { await fetch(`/api/c/${token}/logout`, { method: "POST" }); router.push(`/c/${token}`); router.refresh(); }}>
      <LogOut size={16} />Salir
    </button>
  );
}
