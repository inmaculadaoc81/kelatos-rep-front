import { NextResponse, type NextRequest } from "next/server";

/**
 * Acceso restringido al local: UNA cuenta concreta (la de los empleados del local, hoy soporte@kelatos.com) solo puede usar el dashboard
 * desde las IPs del local. Las demás cuentas (administradores, trabajadores remotos…) no se ven afectadas en absoluto.
 *
 * La configuración vive en el backend (kelatos_app.acceso_local_config) para poder cambiarla sin desplegar:
 *   modo «apagado»  — no se comprueba nada.
 *   modo «observar» — (por defecto) NO bloquea: solo anota desde qué IP entra la cuenta.
 *   modo «bloquear» — fuera de la lista de IPs, se le niega el acceso.
 *
 * Diseño a prueba de quedarse fuera: nunca se bloquea a un administrador ni a un superadmin, y si no se puede leer la configuración
 * (API caída, lenta) se deja pasar. Solo la cuenta restringida puede verse afectada por un error.
 */

type ConfigAccesoLocal = { cuenta: string; modo: "apagado" | "observar" | "bloquear"; ips: string[] };

const BASE_URL = process.env.KELATOS_API_BASE_URL;
const TOKEN = process.env.KELATOS_API_TOKEN;
const TTL_CONFIG_MS = 30_000;
const REINTENTO_TRAS_FALLO_MS = 10_000;
const ANOTAR_CADA_MS = 10 * 60_000;
const TIMEOUT_MS = 2500;

let cache: { valor: ConfigAccesoLocal | null; hasta: number } = { valor: null, hasta: 0 };
const anotados = new Map<string, number>();

async function llamarApi(path: string, cuerpo?: unknown): Promise<unknown> {
  if (!BASE_URL || !TOKEN) throw new Error("API sin configurar");
  const res = await fetch(`${BASE_URL}${path}`, {
    method: cuerpo === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, ...(cuerpo === undefined ? {} : { "Content-Type": "application/json" }) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.json();
}

async function configVigente(): Promise<ConfigAccesoLocal | null> {
  const ahora = Date.now();
  if (ahora < cache.hasta) return cache.valor;
  try {
    const c = (await llamarApi("/v1/seguridad/acceso-local/config")) as { ok?: boolean } & Partial<ConfigAccesoLocal>;
    if (c?.ok && c.cuenta && c.modo && Array.isArray(c.ips)) cache = { valor: { cuenta: c.cuenta.toLowerCase(), modo: c.modo, ips: c.ips }, hasta: ahora + TTL_CONFIG_MS };
    else cache = { valor: cache.valor, hasta: ahora + REINTENTO_TRAS_FALLO_MS };
  } catch {
    // Sin poder leer la configuración se deja pasar (se conserva la última conocida).
    cache = { valor: cache.valor, hasta: ahora + REINTENTO_TRAS_FALLO_MS };
  }
  return cache.valor;
}

/** IP real del cliente tal como la ve el servidor detrás del proxy de Hostinger (primer valor de X-Forwarded-For). */
export function ipDelCliente(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "desconocida";
}

function anotarVisita(email: string, ip: string, req: NextRequest, habriaBloqueado: boolean) {
  const clave = `${email}|${ip}|${habriaBloqueado}`;
  const ahora = Date.now();
  if (ahora - (anotados.get(clave) ?? 0) < ANOTAR_CADA_MS) return;
  anotados.set(clave, ahora);
  if (anotados.size > 500) anotados.clear();
  // Sin await: anotar nunca retrasa ni rompe la petición.
  void llamarApi("/v1/seguridad/acceso-local/visto", {
    email, ip, habriaBloqueado, ua: req.headers.get("user-agent") || "", ruta: req.nextUrl.pathname,
  }).catch(() => {});
}

/**
 * Devuelve una respuesta de bloqueo si la cuenta está restringida, el modo es «bloquear» y la IP no es del local; si no, null (seguir).
 * `exento` = administradores y superadmins: nunca se les aplica.
 */
export async function comprobarAccesoLocal(req: NextRequest, email: string | null | undefined, exento: boolean): Promise<NextResponse | null> {
  if (exento || !email) return null;
  const ruta = req.nextUrl.pathname;
  if (ruta.startsWith("/acceso-restringido")) return null;
  const cfg = await configVigente();
  if (!cfg || cfg.modo === "apagado" || email.toLowerCase() !== cfg.cuenta) return null;

  const ip = ipDelCliente(req);
  const dentro = cfg.ips.includes(ip);
  anotarVisita(email.toLowerCase(), ip, req, !dentro);
  if (cfg.modo !== "bloquear" || dentro) return null;

  return ruta.startsWith("/api/")
    ? NextResponse.json({ ok: false, error: "Esta cuenta solo puede usarse desde el local." }, { status: 403 })
    : NextResponse.redirect(new URL("/acceso-restringido", req.nextUrl.origin));
}
