"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Volume2, X } from "lucide-react";
import { playSound } from "@/lib/sounds";

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

export default function PushToggle({ token, vapid }: { token: string; vapid: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "on" | "blocked" | "unsupported">("idle"); const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapid) return setState("unsupported");
    if (Notification.permission === "denied") setState("blocked");
    navigator.serviceWorker.register("/sw.js").then((r) => r.pushManager.getSubscription()).then((s) => s && setState("on"));
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "push") return;
      playSound("incoming"); setToast({ title: e.data.title, body: e.data.body }); router.refresh(); setTimeout(() => setToast(null), 7000);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [vapid, router]);

  async function enable() {
    setBusy(true); playSound("sent");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("blocked");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapid) });
      const r = await fetch(`/api/c/${token}/push`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (r.ok) setState("on");
    } finally { setBusy(false); }
  }

  return (
    <>
      {toast && (
        <div role="status" className="animate-slide-down fixed inset-x-3 top-3 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-blood bg-ink/95 p-4 shadow-glow backdrop-blur">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blood text-white animate-pulse-ring"><BellRing size={20} /></span>
          <div className="min-w-0 flex-1"><p className="font-semibold">{toast.title}</p><p className="text-sm text-white/70">{toast.body}</p></div>
          <button aria-label="Cerrar" onClick={() => setToast(null)} className="text-white/50 hover:text-white"><X size={18} /></button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {state === "on" && <span className="chip bg-blood/15 text-blood-glow"><Bell size={14} />Avisos activados</span>}
        {state === "idle" && <button onClick={enable} disabled={busy} className="btn"><BellRing size={16} />Activar avisos en este dispositivo</button>}
        {state === "blocked" && <p className="text-sm text-white/55">Las notificaciones están bloqueadas. Actívalas en los permisos del navegador.</p>}
        {state === "unsupported" && <p className="text-sm text-white/55">Para recibir avisos en el celular, instala la app desde el menú del navegador (“Agregar a pantalla de inicio”) y ábrela desde ahí.</p>}
        <button onClick={() => playSound("incoming")} className="btn-ghost"><Volume2 size={16} />Probar sonido</button>
      </div>
    </>
  );
}
