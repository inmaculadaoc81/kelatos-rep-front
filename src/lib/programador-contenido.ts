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
    if (ruta.length === 2) return metodo === "GET" || metodo === "POST";
    if (ruta.length === 3) return metodo === "PATCH" && /^\d+$/.test(id);
    if (ruta.length === 4) return metodo === "POST" && /^\d+$/.test(id) && (accion === "cancel" || accion === "retry");
    return false;
  }
  // Marca (para precargar los colores) y miniatura de la primera slide de un carrusel ya generado.
  if (sub === "brand") return metodo === "GET" && ruta.length === 2;
  if (sub === "carousels") {
    if (ruta.length === 2) return metodo === "GET" || metodo === "POST";
    if (!/^\d+$/.test(id)) return false;
    // Nunca borrar un carrusel entero, enviarlo a revisión ni publicarlo en Instagram a mano (eso lo hace la programación).
    if (ruta.length === 3) return metodo === "GET" || metodo === "PATCH";
    if (accion === "publish" || accion === "review" || accion === "approve") return false;
    return ["GET", "PATCH", "POST", "PUT", "DELETE"].includes(metodo);
  }
  // Imágenes de la marca: puede verlas y subir nuevas (para las slides), no borrarlas. Descarga de exportaciones, solo lectura.
  if (sub === "assets") return (metodo === "GET" && (ruta.length === 2 || ruta.length === 3)) || (metodo === "POST" && ruta.length === 2);
  if (sub === "exports") return metodo === "GET" && ruta.length === 4 && ruta[3] === "download" && /^\d+$/.test(id);
  return false;
}
