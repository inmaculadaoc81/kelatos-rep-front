import crypto from "node:crypto";

/**
 * El HTML de un correo se muestra en un iframe con `srcDoc` (origen opaco),
 * así que las peticiones de <img> que salen de ahí no llevan la cookie de
 * sesión (SameSite la bloquea al verse como cross-site) — /api/mails/imagen
 * no puede autenticar esas peticiones con accesoMails() como el resto de
 * rutas de Gestión MAILS. En su lugar, la página (que sí es una petición
 * normal, con cookie) pide aquí un token de corta duración y lo añade a la
 * URL de cada imagen reescrita. No identifica a nadie ni da acceso a datos:
 * solo demuestra que, hace poco, alguien con sesión válida cargó la página.
 */
const TTL_MS = 30 * 60 * 1000;

function firmar(exp: number): string {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET || "").update(String(exp)).digest("base64url");
}

export function emitirTokenImagenMail(): { token: string; exp: number } {
  const exp = Date.now() + TTL_MS;
  return { token: `${exp}.${firmar(exp)}`, exp };
}

export function tokenImagenMailValido(token: string): boolean {
  const [expStr, firma] = String(token || "").split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() || !firma) return false;
  const esperada = firmar(exp);
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
