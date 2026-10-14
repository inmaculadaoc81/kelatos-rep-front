/**
 * Vista "Equipos entregados" (Reparaciones): calendario mensual con KPIs de los equipos que ya salieron del taller
 * (entregados en local o enviados por mensajería), y una lista filtrable por fechas. Petición del usuario,
 * 2026-10-14. La fecha que cuenta es la de ENTREGA (no la de recepción).
 */
import { esSuperadmin, esCuentaEmpleadosRestringida } from "@/lib/superadmin";

/**
 * Quién ve la vista: administradores, superadmins y la cuenta de empleados (soporte@kelatos.com). Se usa en el
 * menú, en proxy.ts y en la ruta /api/equipos-entregados — si cambia aquí, cambia en los tres.
 */
export function puedeVerEquiposEntregados(user: { email?: string | null; role?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  return user.role === "admin" || esSuperadmin(user.email) || esCuentaEmpleadosRestringida(user.email);
}

export type TipoEntrega = "local" | "mensajeria";

/** Fila reducida de un equipo entregado (solo lo que muestra la vista). */
export interface EquipoEntregado {
  resguardo: string;
  /** Día de la entrega, AAAA-MM-DD en hora de Madrid. */
  dia: string;
  /** Fecha y hora exactas de la entrega (ISO), por si se quiere mostrar la hora. */
  fechaEntrega: string;
  tipoEntrega: TipoEntrega;
  cliente: string;
  telefono: string;
  equipo: string;
  tecnico: string;
  /** Estado de la reparación al salir (Reparado, Presupuesto Rechazado, No tiene Reparación...). */
  estado: string;
  /** "GARANTIA" u otro tipo de ingreso, si lo hay. */
  tipoIngreso: string;
  /** Factura o ticket de cobro (vacío si no se generó ninguno). */
  documento: string;
}
