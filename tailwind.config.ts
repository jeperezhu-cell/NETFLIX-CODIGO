import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050404", coal: "#120b0c", ash: "#1d1315",
        blood: { DEFAULT: "#e10613", dark: "#8f0610", glow: "#ff2a3a" }, bone: "#f3efec"
      },
      fontFamily: { display: ["var(--font-display)", "serif"], sans: ["var(--font-body)", "system-ui", "sans-serif"] },
      boxShadow: { ember: "0 8px 32px -8px rgba(225,6,19,.6)", glow: "0 0 0 1px rgba(225,6,19,.5), 0 0 40px -6px rgba(225,6,19,.55)" },
      keyframes: {
        spinSlow: { to: { transform: "rotate(360deg)" } },
        popIn: { from: { opacity: "0", transform: "scale(.94) translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-10px)" }, "75%": { transform: "translateX(10px)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-24px)" }, to: { opacity: "1", transform: "none" } },
        pulseRing: { "0%": { boxShadow: "0 0 0 0 rgba(225,6,19,.6)" }, "100%": { boxShadow: "0 0 0 14px rgba(225,6,19,0)" } }
      },
      animation: {
        "spin-slow": "spinSlow 90s linear infinite", "pop-in": "popIn .45s cubic-bezier(.2,.8,.2,1) both",
        shake: "shake .4s", "slide-down": "slideDown .4s ease-out both", "pulse-ring": "pulseRing 1.8s infinite"
      }
    }
  },
  plugins: []
};
export default config;
