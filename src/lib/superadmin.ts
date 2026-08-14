/**
 * Cuentas con permiso para borrar registros reales del dashboard
 * (kelatos_app.reparaciones/clientes/alquileres/ventas/facturas_manuales)
 * — reemplaza el borrado manual que antes se hacía en Sheets. Restringido
 * a un conjunto explícito de cuentas, comprobado tanto aquí como en el
 * backend Node (ver SUPERADMIN_EMAIL en kelatos-rep-back/src/server.js,
 * que debe mantenerse en el mismo conjunto).
 */
export const SUPERADMIN_EMAILS = new Set(["kelatoscielo@gmail.com", "kelatosclaude2@gmail.com"]);

export function esSuperadmin(email: string | null | undefined): boolean {
  return !!email && SUPERADMIN_EMAILS.has(email.toLowerCase());
}
