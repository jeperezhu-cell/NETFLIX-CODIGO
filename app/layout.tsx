import type { Metadata, Viewport } from "next";
import { Shippori_Mincho_B1, Manrope } from "next/font/google";
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
      <body>{children}</body>
    </html>
  );
}
