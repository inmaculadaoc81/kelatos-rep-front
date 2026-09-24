import type { NextConfig } from "next";

// Cabeceras de las rutas PÚBLICAS de valoración: sin framing, sin referer, sin
// indexado, sin caché y con una política de contenido que solo permite lo
// propio (ni scripts, ni imágenes, ni conexiones de terceros).
const CSP_VALORACION = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
].join("; ");

const CABECERAS_PUBLICAS = [
  { key: "Content-Security-Policy", value: CSP_VALORACION },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/valoracion", headers: CABECERAS_PUBLICAS },
      { source: "/valoracion/:path*", headers: CABECERAS_PUBLICAS },
      { source: "/api/valoracion/:path*", headers: CABECERAS_PUBLICAS },
    ];
  },
  // Permite compilar en un directorio aparte sin pisar el `.next` que está
  // usando el servidor de desarrollo:
  //   NEXT_BUILD_DIR=.next-build npm run build
  // Lanzar `next build` contra el `.next` de un `next dev` activo deja al
  // servidor sirviendo 500 hasta que se borra el directorio y se reinicia.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
};

export default nextConfig;
