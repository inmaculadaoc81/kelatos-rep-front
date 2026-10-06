import type { Session } from "next-auth";

/** Panel de contenido de la community manager (empleado de asistencia 23) y
    cuenta de administración que lo revisa en detalle. */
export const EMPLEADO_CONTENIDO_ID = 23;
export const EMAIL_ADMIN_CONTENIDO = "kelatosclaude2@gmail.com";

export function puedeVerContenido(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.asistenciaEmpleadoId === EMPLEADO_CONTENIDO_ID) return true;
  return (session.user.email || "").toLowerCase() === EMAIL_ADMIN_CONTENIDO;
}
