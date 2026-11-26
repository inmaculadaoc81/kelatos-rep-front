import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_IR_DASHBOARD } from "@/lib/superadmin";

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

type Modo = "apagado" | "observar" | "bloquear";
type ConfigAccesoLocal = { cuenta: string; cuentas: string[]; modo: Modo; ips: string[]; ipsDinamicas: string[]; equiposHash: string[]; modoRemotos: Modo; ipsRemotos: string[]; cuentasRemotas: string[] };

/** Cookie que lleva el navegador de un equipo del local autorizado (ver /api/acceso-local/alta). Solo se compara su hash con el del servidor. */
export const COOKIE_EQUIPO_LOCAL = "kelatos_equipo_local";

async function hashHex(texto: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
    if (c?.ok && c.cuenta && c.modo && Array.isArray(c.ips)) cache = { valor: { cuenta: c.cuenta.toLowerCase(), cuentas: (Array.isArray(c.cuentas) && c.cuentas.length ? c.cuentas : [c.cuenta]).map((x) => String(x).toLowerCase()), modo: c.modo, ips: c.ips, ipsDinamicas: Array.isArray(c.ipsDinamicas) ? c.ipsDinamicas : [], equiposHash: Array.isArray(c.equiposHash) ? c.equiposHash : [], modoRemotos: c.modoRemotos ?? "observar", ipsRemotos: Array.isArray(c.ipsRemotos) ? c.ipsRemotos : [], cuentasRemotas: Array.isArray(c.cuentasRemotas) ? c.cuentasRemotas.map((x) => String(x).toLowerCase()) : [] }, hasta: ahora + TTL_CONFIG_MS };
    else cache = { valor: cache.valor, hasta: ahora + REINTENTO_TRAS_FALLO_MS };
  } catch {
    // Sin poder leer la configuración se deja pasar (se conserva la última conocida).
    cache = { valor: cache.valor, hasta: ahora + REINTENTO_TRAS_FALLO_MS };
  }
  return cache.valor;
}

/** IP real del cliente tal como la ve el servidor detrás del proxy de Hostinger (primer valor de X-Forwarded-For). */
export function ipDelClienteDe(req: { headers: Headers }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "desconocida";
}

export function ipDelCliente(req: NextRequest): string {
  return ipDelClienteDe(req);
}

function anotarVisita(email: string, ip: string, req: NextRequest, habriaBloqueado: boolean, equipoHash: string | null) {
  const clave = `${email}|${ip}|${habriaBloqueado}`;
  const ahora = Date.now();
  if (ahora - (anotados.get(clave) ?? 0) < ANOTAR_CADA_MS) return;
  anotados.set(clave, ahora);
  if (anotados.size > 500) anotados.clear();
  // Sin await: anotar nunca retrasa ni rompe la petición.
  void llamarApi("/v1/seguridad/acceso-local/visto", {
    email, ip, habriaBloqueado, equipoHash, ua: req.headers.get("user-agent") || "", ruta: req.nextUrl.pathname,
  }).catch(() => {});
}

/**
 * Cuentas del grupo «remotos» que, desde fuera de la IP, pueden PEDIR acceso para su equipo, igual que los del local: el navegador queda
 * pendiente y solo entra cuando un administrador lo aprueba en «Equipos del local». Decisión del usuario, 2026-11-26.
 */
export const CUENTAS_CON_APROBACION = new Set(["carlogfn@gmail.com"]);

/**
 * Grupo «remotos»: los administradores/superadmins que NO son cuentas del local y los empleados remotos con contraseña listados en el backend
 * (cuentas_remotas) solo pueden usar el dashboard desde las IPs de ips_remotos (la del PC de acceso remoto). Desde su propio ordenador, no.
 * Seguridad: modo «apagado»/«observar», sin IPs en la lista o sin poder leer la configuración → se deja pasar. Se desactiva con modo_remotos='apagado'.
 */
export async function comprobarAccesoRemotos(req: NextRequest, email: string | null | undefined, esAdmin: boolean): Promise<NextResponse | null> {
  if (!email) return null;
  const ruta = req.nextUrl.pathname;
  // La pantalla de aviso y la solicitud de equipo deben poder abrirse siempre (si no, no se podría pedir autorización).
  if (ruta.startsWith("/acceso-restringido") || ruta.startsWith("/api/acceso-local/solicitud")) return null;
  const cfg = await configVigente();
  if (!cfg || cfg.modoRemotos === "apagado" || cfg.ipsRemotos.length === 0) return null;
  const correo = email.toLowerCase();
  // Las cuentas del local ya se rigen por su propia regla (comprobarAccesoLocal), aunque sean admin.
  if (cfg.cuentas.includes(correo)) return null;
  if (!esAdmin && !cfg.cuentasRemotas.includes(correo)) return null;
  const ip = ipDelCliente(req);
  const puedePedir = CUENTAS_CON_APROBACION.has(correo);
  const cookie = puedePedir ? req.cookies.get(COOKIE_EQUIPO_LOCAL)?.value : undefined;
  const equipoHash = cookie ? await hashHex(cookie) : null;
  const equipoAutorizado = !!equipoHash && cfg.equiposHash.includes(equipoHash);
  const dentro = equipoAutorizado || cfg.ipsRemotos.includes(ip);
  anotarVisita(correo, ip, req, !dentro, equipoAutorizado ? equipoHash : null);
  if (cfg.modoRemotos !== "bloquear" || dentro) return null;
  if (ruta.startsWith("/api/")) return NextResponse.json({ ok: false, error: "Esta cuenta solo puede usarse desde el equipo de acceso remoto." }, { status: 403 });
  // r=2: puede pedir que se apruebe este equipo; r=1: solo desde el equipo de acceso remoto.
  return NextResponse.redirect(new URL(`/acceso-restringido?r=${puedePedir ? 2 : 1}`, req.nextUrl.origin));
}

/**
 * Devuelve una respuesta de bloqueo si la cuenta está restringida, el modo es «bloquear» y la IP no es del local; si no, null (seguir).
 * `exento` = administradores y superadmins: nunca se les aplica.
 */
export async function comprobarAccesoLocal(req: NextRequest, email: string | null | undefined, exento: boolean): Promise<NextResponse | null> {
  if (exento || !email) return null;
  const ruta = req.nextUrl.pathname;
  // La pantalla de aviso y la solicitud de equipo deben poder abrirse siempre (si no, un equipo bloqueado no podría pedir autorización).
  if (ruta.startsWith("/acceso-restringido") || ruta.startsWith("/api/acceso-local/solicitud")) return null;
  const cfg = await configVigente();
  const correo = email.toLowerCase();
  if (!cfg || cfg.modo === "apagado" || !cfg.cuentas.includes(correo)) return null;
  // Las cuentas personales de la lista (no la compartida del mostrador) pueden FICHAR desde cualquier sitio, también el móvil: solo el dashboard
  // queda limitado a los equipos del local.
  if (correo !== cfg.cuenta && (ruta.startsWith("/asistencia/kiosk") || ruta.startsWith("/api/asistencia/kiosk"))) return null;

  const ip = ipDelCliente(req);
  // Dentro = equipo autorizado (su navegador lleva la cookie de alta; sirve aunque cambie la IP), IP fija de la lista o IP que el propio
  // local ha anunciado hace poco (latido).
  const cookie = req.cookies.get(COOKIE_EQUIPO_LOCAL)?.value;
  const equipoHash = cookie ? await hashHex(cookie) : null;
  const equipoAutorizado = !!equipoHash && cfg.equiposHash.includes(equipoHash);
  const dentro = equipoAutorizado || cfg.ips.includes(ip) || cfg.ipsDinamicas.includes(ip);
  anotarVisita(email.toLowerCase(), ip, req, !dentro, equipoAutorizado ? equipoHash : null);
  if (cfg.modo !== "bloquear" || dentro) return null;

  if (ruta.startsWith("/api/")) return NextResponse.json({ ok: false, error: "Esta cuenta solo puede usarse desde el local." }, { status: 403 });
  // Las cuentas personales (no la compartida del mostrador) caen en el fichaje, que sí pueden usar desde cualquier sitio; la compartida ve el aviso.
  // Recién iniciada la sesión no pidieron el dashboard: caen en el fichaje. Si ya pulsaron «Ir al dashboard» (cookie), se les explica por qué no entra.
  const pidioDashboard = !!req.cookies.get(COOKIE_IR_DASHBOARD);
  return NextResponse.redirect(new URL(correo !== cfg.cuenta && !pidioDashboard ? "/asistencia/kiosk" : "/acceso-restringido", req.nextUrl.origin));
}
