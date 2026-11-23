import type { Metadata, Viewport } from "next";
import { Shippori_Mincho_B1, Manrope } from "next/font/google";
import Sharingan from "@/components/Sharingan";
import "./globals.css";

const display = Shippori_Mincho_B1({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "ITACHI PERÚ CONTROL",
  description: "Plataforma privada de administración de cuentas y suscripciones.",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/icon-192.png" },
  robots: { index: false, follow: false }
};
export const viewport: Viewport = { themeColor: "#050404", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-48 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-blood/20 blur-[140px]" />
          <div className="absolute -bottom-56 -right-40 h-[480px] w-[480px] rounded-full bg-blood-dark/30 blur-[140px]" />
          <Sharingan className="absolute -right-48 top-1/3 h-[560px] w-[560px] animate-spin-slow opacity-[0.05]" />
        </div>
        {children}
      </body>
    </html>
  );
}
