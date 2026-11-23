/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Navegador headless para el botón "Actualizar hogar" (corre en el servidor, el cliente no ve nada)
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/c/*/household": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/c/*/household/route": ["./node_modules/@sparticuz/chromium/bin/**"]
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" }
      ]
    }];
  }
};
export default nextConfig;
