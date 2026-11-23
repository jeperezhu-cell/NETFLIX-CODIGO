export type Vars = { usuario: string; correo: string; perfil: string; vencimiento: string; monto: string };
export const render = (t: string, v: Vars) =>
  t.replace(/\{(usuario|correo|perfil|vencimiento|monto)\}/g, (_, k: keyof Vars) => v[k] ?? "");
export const fmtDate = (iso?: string | null) => (iso ? iso.split("-").reverse().join("/") : "");

export const REMINDERS = {
  pre: { title: "Tu suscripción está por vencer", body: "Hola {usuario}, tu suscripción está próxima a vencer. Te recordamos que debes realizar tu pago el {vencimiento}." },
  due: { title: "Hoy vence tu suscripción", body: "Hola {usuario}, hoy vence tu suscripción. Por favor, realiza tu pago para mantener activo tu servicio." },
  tol1: { title: "Renovación pendiente", body: "Hola {usuario}, tu suscripción se encuentra pendiente de renovación. Evita el corte y realiza tu pago." },
  tol2: { title: "Último día de tolerancia", body: "Hola {usuario}, hoy es tu último día de tolerancia. Realiza tu pago para evitar la suspensión." },
  suspend: { title: "Suscripción suspendida", body: "Hola {usuario}, tu suscripción ha sido suspendida por falta de renovación. Para poder continuar utilizando el servicio, renueva tu suscripción y contacta con administración." }
} as const;
