// Sonido propio "kunai + taiko" generado con Web Audio (sin archivos de audio).
let ctx: AudioContext | null = null;
export function playSound(kind: "sent" | "incoming" = "incoming") {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    // golpe grave de taiko
    const thud = ctx.createOscillator(), tg = ctx.createGain();
    thud.type = "sine"; thud.frequency.setValueAtTime(110, t0); thud.frequency.exponentialRampToValueAtTime(42, t0 + 0.3);
    tg.gain.setValueAtTime(0.7, t0); tg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
    thud.connect(tg).connect(ctx.destination); thud.start(t0); thud.stop(t0 + 0.4);
    // destellos metálicos
    const notes = kind === "sent" ? [523.25, 783.99, 1046.5] : [1318.5, 987.77, 1318.5, 1760];
    notes.forEach((f, i) => {
      const t = t0 + 0.12 + i * 0.11;
      [1, 2.01].forEach((m, j) => {
        const o = ctx!.createOscillator(), g = ctx!.createGain();
        o.type = j ? "sine" : "triangle"; o.frequency.value = f * m;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(j ? 0.06 : 0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(g).connect(ctx!.destination); o.start(t); o.stop(t + 0.5);
      });
    });
  } catch { /* el navegador puede bloquear audio sin interacción previa */ }
}
