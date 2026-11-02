import type { Session } from "next-auth";

/** Panel de contenido de la community manager (empleado de asistencia 23) y
    cualquier cuenta admin, que lo revisa en detalle. Antes restringido a una
    única cuenta (kelatosclaude2@gmail.com) — ampliado a cualquier admin a
    petición del usuario, 2026-10-07 (no tenía sentido que solo una cuenta
    admin concreta pudiera revisarlo). */
export const EMPLEADO_CONTENIDO_ID = 23;

/** Gean Paul: entra al panel solo para ver en el calendario las piezas que se le asignan (solo lectura). */
export const EMPLEADO_SOLO_ASIGNADAS_ID = 14;

export function esSoloAsignadas(session: Session | null): boolean {
  return session?.user?.role !== "admin" && session?.user?.asistenciaEmpleadoId === EMPLEADO_SOLO_ASIGNADAS_ID;
}

/** Cualquiera que pueda entrar al panel, también quien solo ve lo asignado. */
export function puedeVerContenido(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.asistenciaEmpleadoId === EMPLEADO_CONTENIDO_ID) return true;
  if (esSoloAsignadas(session)) return true;
  return session.user.role === "admin";
}

/** Gestionar el contenido (crear, editar, borrar, Drive…): todos menos quien solo ve lo asignado. */
export function puedeGestionarContenido(session: Session | null): boolean {
  return puedeVerContenido(session) && !esSoloAsignadas(session);
}
