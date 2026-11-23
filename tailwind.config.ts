import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050404",
        coal: "#120b0c",
        ash: "#1d1315",
        blood: { DEFAULT: "#e10613", dark: "#8f0610", glow: "#ff2a3a" },
        bone: "#f3efec"
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      boxShadow: { ember: "0 0 40px -8px rgba(225,6,19,.55)" }
    }
  },
  plugins: []
};
export default config;
