/**
 * Origen público real de la petición, detrás de cualquier proxy inverso
 * (Vercel, Hostinger, etc.) — `new URL(req.url).origin` NO sirve para esto:
 * refleja la URL interna que ve el proceso Node (p. ej. "http://0.0.0.0:3000"
 * en Hostinger), no el host público que escribió el cliente en el navegador.
 * Bug real reportado tras migrar a Hostinger: la URL de la tablet y el QR
 * del formulario público salían con "https://0.0.0.0:3000/formulario"
 * (ERR_ADDRESS_INVALID al abrirla) — en Vercel nunca se notó porque su
 * runtime sí normaliza req.url al host público antes de que el código lo
 * vea. Se reconstruye a partir de las cabeceras Host/X-Forwarded-*, que
 * cualquier proxy (incluido el propio Next.js en Vercel) reenvía tal cual.
 */
export function origenPublico(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return new URL(req.url).origin;
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
