import { sql } from "./db";
const DEFAULT = {
  title: "TU SUSCRIPCIÓN HA SIDO SUSPENDIDA",
  message: "Para poder continuar utilizando tu servicio, renueva tu suscripción.",
  phone: "51986165524", phoneLabel: "986165524"
};
export async function getRenew() {
  const [r] = await sql`select value from system_settings where key = 'renew'`;
  const v = { ...DEFAULT, ...(r?.value ?? {}) };
  return { ...v, whatsapp: `https://wa.me/${v.phone}?text=${encodeURIComponent("Hola, quiero renovar mi suscripción.")}` };
}
