"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

export default function PushToggle({ token, vapid }: { token: string; vapid: string }) {
  const [state, setState] = useState<"idle" | "on" | "blocked" | "unsupported">("idle"); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapid) return setState("unsupported");
    if (Notification.permission === "denied") return setState("blocked");
    navigator.serviceWorker.register("/sw.js").then((r) => r.pushManager.getSubscription()).then((s) => s && setState("on"));
  }, [vapid]);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("blocked");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapid) });
      const r = await fetch(`/api/c/${token}/push`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (r.ok) setState("on");
    } finally { setBusy(false); }
  }
  if (state === "unsupported") return <p className="text-sm text-white/55">Para recibir avisos en el celular, instala la app desde el menú del navegador (“Agregar a pantalla de inicio”) y vuelve a abrir esta página.</p>;
  if (state === "blocked") return <p className="text-sm text-white/55">Las notificaciones están bloqueadas. Actívalas en los permisos del navegador.</p>;
  if (state === "on") return <p className="flex items-center gap-2 text-sm text-white/75"><Bell size={16} className="text-blood" />Avisos activados en este dispositivo.</p>;
  return <button onClick={enable} disabled={busy} className="btn-ghost"><BellOff size={16} />Activar avisos en este dispositivo</button>;
}
