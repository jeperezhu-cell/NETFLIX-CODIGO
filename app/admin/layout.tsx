import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import AdminLogout from "@/components/AdminLogout";
import AdminNav from "@/components/AdminNav";
import Sharingan from "@/components/Sharingan";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/");
  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/10 bg-black/50 p-6 backdrop-blur md:flex">
        <div className="flex items-center gap-3">
          <Sharingan className="h-11 w-11 animate-spin-slow drop-shadow-[0_0_14px_rgba(225,6,19,.7)]" />
          <p className="title text-xl leading-tight">ITACHI<br /><span className="text-blood">PERÚ</span></p>
        </div>
        <AdminNav variant="side" />
        <div className="mt-auto space-y-3">
          <p className="truncate text-xs text-white/40">Sesión: {admin.username}</p>
          <AdminLogout />
        </div>
      </aside>
      <header className="flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2"><Sharingan className="h-8 w-8 animate-spin-slow" /><p className="title text-lg">ITACHI <span className="text-blood">PERÚ</span></p></div>
        <div className="w-32"><AdminLogout /></div>
      </header>
      <div className="min-w-0 p-4 pb-28 md:p-10">{children}</div>
      <AdminNav variant="bottom" />
    </div>
  );
}
