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

export function esJson(req: Request): boolean {
  return (req.headers.get("content-type") || "").toLowerCase().startsWith("application/json");
}
