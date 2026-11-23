export const AVATARS = [
  { key: "rojo", bg: "#e50914" }, { key: "azul", bg: "#0a84ff" },
  { key: "amarillo", bg: "#f5c518" }, { key: "verde", bg: "#2ecc71" },
  { key: "morado", bg: "#8e44ad" }, { key: "naranja", bg: "#ff7a1a" },
  { key: "rosa", bg: "#ff4d8d" }, { key: "cian", bg: "#16c1d6" }
];
export const avatarBg = (k: string) => AVATARS.find((a) => a.key === k)?.bg ?? "#e50914";
