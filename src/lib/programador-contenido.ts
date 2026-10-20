import { EMPLEADO_CONTENIDO_ID } from "@/lib/contenido-acceso";
import { esSuperadmin } from "@/lib/superadmin";

/** La community manager (empleada de Asistencia 23): en Agentes V2 solo ve «Programar contenido». */
export function esProgramadorContenido(user: { asistenciaEmpleadoId?: number | null } | null | undefined): boolean {
  return !!user && user.asistenciaEmpleadoId === EMPLEADO_CONTENIDO_ID;
}

/** Quién puede entrar a «Programar contenido»: administradores, superadmins y la community manager. */
export function puedeProgramarContenido(user: { role?: string | null; email?: string | null; asistenciaEmpleadoId?: number | null } | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || esSuperadmin(user.email) || esProgramadorContenido(user);
}

/**
 * Qué puede pedir al proxy de Agentes V2 una cuenta que NO es administradora (la community manager): solo lo
 * imprescindible para programar contenido. `metodo` en mayúsculas; `ruta` son los segmentos tras /api/agentes-v2/.
 */
export function rutaPermitidaProgramador(metodo: string, ruta: string[]): boolean {
  const [recurso, sub, id, accion] = ruta;
  if (recurso === "organizations") return metodo === "GET" && ruta.length === 1;
  if (recurso !== "social") return false;
  if (sub === "schedule") {
    if (ruta.length === 1) return metodo === "GET" || metodo === "POST";
    if (ruta.length === 2) return metodo === "PATCH";
    if (ruta.length === 3) return metodo === "POST" && (accion === "cancel" || accion === "retry");
    return false;
  }
  // Marca (para precargar los colores) y miniatura de la primera slide de un carrusel ya generado.
  if (sub === "brand") return metodo === "GET" && ruta.length === 2;
  if (sub === "carousels") return metodo === "GET" && ruta.length === 6 && ruta[3] === "slides" && ruta[5] === "image" && /^\d+$/.test(id) && /^\d+$/.test(ruta[4]);
  return false;
}
