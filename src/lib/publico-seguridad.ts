/**
 * Ayudas de seguridad para las rutas PÚBLICAS (sin sesión), p. ej. el
 * formulario de valoración. Ninguna sustituye a los límites del backend:
 * son capas adicionales.
 */

/**
 * IP del cliente. Se usa la ÚLTIMA entrada de X-Forwarded-For: es la que añade
 * el proxy de confianza; la primera la puede escribir el propio visitante y
 * permitiría saltarse el límite por IP cambiando la cabecera.
 */
export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const ultima = xff ? xff.split(",").map((x) => x.trim()).filter(Boolean).pop() : "";
  return (ultima || req.headers.get("x-real-ip") || "desconocida").slice(0, 64);
}

/**
 * Las peticiones que MODIFICAN algo solo se aceptan si vienen de nuestra
 * propia página (cabecera Origin igual al host). Un navegador la manda siempre
 * en un POST; una web ajena no puede falsearla, y un script sin navegador
 * tiene que hacerlo a propósito (y aun así pasa por los límites del backend).
 */
export function origenPropio(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host.split(",")[0].trim();
  } catch {
    return false;
  }
}

export const COOKIE_DISPOSITIVO = "kv_dev";
export const COOKIE_ENVIADA = "kv_ok";
const SEIS_MESES = 60 * 60 * 24 * 180;

export function leerCookie(req: Request, nombre: string): string {
  const crudo = req.headers.get("cookie") || "";
  for (const parte of crudo.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nombre) return decodeURIComponent(v.join("="));
  }
  return "";
}

/**
 * Identificador del navegador/teléfono del visitante (cookie propia, httpOnly,
 * aleatoria, sin datos personales). Sirve para reconocer que el mismo cliente
 * ya envió una valoración aunque cambie de correo.
 */
export function dispositivoDe(req: Request): { id: string; nuevo: boolean } {
  const actual = leerCookie(req, COOKIE_DISPOSITIVO);
  if (/^[A-Za-z0-9-]{16,64}$/.test(actual)) return { id: actual, nuevo: false };
  return { id: crypto.randomUUID(), nuevo: true };
}

export function opcionesCookie() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SEIS_MESES };
}

export function esJson(req: Request): boolean {
  return (req.headers.get("content-type") || "").toLowerCase().startsWith("application/json");
}

// ── Límite de peticiones (en memoria) ─────────────────────────────────────
// Frena las inundaciones ANTES de tocar el backend. Es por proceso: no sustituye
// a los límites del backend, los complementa.
const ventanas = new Map<string, number[]>();

/** true si la petición cabe en el límite; false si hay que rechazarla (429). */
export function dentroDelLimite(req: Request, clave: string, max: number, ventanaMs: number): boolean {
  const k = `${clave}|${ipDe(req)}`;
  const ahora = Date.now();
  const lista = (ventanas.get(k) || []).filter((t) => ahora - t < ventanaMs);
  if (lista.length >= max) {
    ventanas.set(k, lista);
    return false;
  }
  lista.push(ahora);
  ventanas.set(k, lista);
  if (ventanas.size > 20000) for (const [kk, v] of ventanas) if (!v.some((t) => ahora - t < ventanaMs)) ventanas.delete(kk);
  return true;
}

/** Clientes que se identifican como scripts o rastreadores (o no se identifican). */
export function pareceAutomatizado(req: Request): boolean {
  const ua = (req.headers.get("user-agent") || "").trim();
  if (ua.length < 12) return true;
  return /(curl|wget|python|httpclient|okhttp|axios|node-fetch|go-http|java\/|libwww|scrapy|headless|phantom|bot\b|spider|crawl)/i.test(ua);
}
