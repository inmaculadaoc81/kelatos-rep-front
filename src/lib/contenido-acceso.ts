import type { Session } from "next-auth";

/** Panel de contenido de la community manager (empleado de asistencia 23) y
    cualquier cuenta admin, que lo revisa en detalle. Antes restringido a una
    única cuenta (kelatosclaude2@gmail.com) — ampliado a cualquier admin a
    petición del usuario, 2026-10-07 (no tenía sentido que solo una cuenta
    admin concreta pudiera revisarlo). */
export const EMPLEADO_CONTENIDO_ID = 23;

export function puedeVerContenido(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.asistenciaEmpleadoId === EMPLEADO_CONTENIDO_ID) return true;
  return session.user.role === "admin";
}
