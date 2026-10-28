import { esSuperadmin } from "@/lib/superadmin";

/**
 * Vista «Redes sociales» (Agentes → /agentes/redes: analítica de Instagram, solo lectura). Además de administradores y superadmins,
 * pueden entrar SOLO a esa vista estas cuentas (empleados de Asistencia): Carlo Farfan (12), Cielo Ocaña (13), Gean Paul (14) y
 * Jeannie (23). No ven ninguna otra pantalla de Agentes (Auditoría de seguridad, SEO de vídeo, Oportunidades de PR…).
 * Petición del usuario, 2026-10-28.
 */
const EMPLEADOS_REDES = new Set([12, 13, 14, 23]);
const EMAILS_REDES = new Set(["carlo@kelatos.com", "cielo@kelatos.com", "gean@kelatos.com", "jeannie@kelatos.com"]);

type Usuario = { role?: string | null; email?: string | null; asistenciaEmpleadoId?: number | null } | null | undefined;

/** Cuenta del grupo que solo ve Redes sociales (no incluye a los administradores). */
export function esUsuarioRedes(user: Usuario): boolean {
  if (!user) return false;
  return (user.asistenciaEmpleadoId != null && EMPLEADOS_REDES.has(user.asistenciaEmpleadoId)) || (!!user.email && EMAILS_REDES.has(user.email.toLowerCase()));
}

/** Quién puede entrar a la vista de Redes sociales. */
export function puedeVerRedesSociales(user: Usuario): boolean {
  if (!user) return false;
  return user.role === "admin" || esSuperadmin(user.email) || esUsuarioRedes(user);
}

/** ¿La ruta es la página de Redes sociales (o algo dentro de ella)? */
export function esRutaRedesSociales(pathname: string): boolean {
  return pathname === "/agentes/redes" || pathname.startsWith("/agentes/redes/");
}

/**
 * Qué puede pedir al proxy de Agentes V2 una de estas cuentas (no administradora): solo lo que usa la vista de Redes sociales.
 * `metodo` en mayúsculas; `ruta` son los segmentos tras /api/agentes-v2/.
 */
export function rutaPermitidaRedes(metodo: string, ruta: string[]): boolean {
  // Lista de organizaciones (para el selector) y analítica de Instagram.
  if (ruta[0] === "organizations") return metodo === "GET" && ruta.length === 1;
  if (ruta[0] === "social" && ruta[1] === "analytics") {
    if (ruta.length === 3 && ruta[2] === "resumen") return metodo === "GET";
    if (ruta.length === 3 && ruta[2] === "sincronizar") return metodo === "POST"; // botón «Actualizar ahora»
  }
  return false;
}
