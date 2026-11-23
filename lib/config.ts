export const RENEW = {
  title: "TU SUSCRIPCIÓN HA SIDO SUSPENDIDA",
  message: "Para poder continuar utilizando tu servicio, renueva tu suscripción.",
  phone: process.env.RENEW_PHONE ?? "51986165524",
  phoneLabel: process.env.RENEW_PHONE_LABEL ?? "986165524",
  whatsapp() {
    return `https://wa.me/${this.phone}?text=${encodeURIComponent("Hola, quiero renovar mi suscripción.")}`;
  }
};
// Acciones oficiales de Netflix: solo se abre el procedimiento oficial; no se generan códigos ni enlaces privados.
export const ACTIONS = [
  { key: "btn_pin", label: "CAMBIAR PIN DE PERFIL", icon: "KeyRound", url: "https://help.netflix.com/es/node/10000" },
  { key: "btn_link", label: "LINK HOGAR", icon: "Link2", url: "https://help.netflix.com/es/node/101554" },
  { key: "btn_code4", label: "CÓDIGO HOGAR 4 DÍGITOS", icon: "Hash", url: "https://help.netflix.com/es/node/101554" },
  { key: "btn_code6", label: "CÓDIGO HOGAR 6 DÍGITOS", icon: "ShieldCheck", url: "https://help.netflix.com/es/node/101554" }
] as const;
