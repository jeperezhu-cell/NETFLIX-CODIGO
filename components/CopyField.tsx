"use client";
import { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

export default function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [shown, setShown] = useState(!secret); const [ok, setOk] = useState(false);
  async function copy() { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }
  return (
    <div className="group rounded-xl border border-white/10 bg-black/40 p-4 transition hover:border-blood/40">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/45">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate font-mono text-lg">{shown ? value : "•".repeat(Math.min(value.length, 14))}</p>
        {secret && <button onClick={() => setShown(!shown)} className="btn-ghost !px-3" aria-label={shown ? "Ocultar" : "Mostrar"}>{shown ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
        <button onClick={copy} className={`btn-ghost !px-3 ${ok ? "!border-blood !text-blood-glow" : ""}`} aria-label={`Copiar ${label}`}>{ok ? <Check size={16} /> : <Copy size={16} />}</button>
      </div>
    </div>
  );
}
