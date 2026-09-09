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

/**
 * Acceso al dashboard de Transferencias (vista + acciones: conciliar,
 * revertir, devoluciones) — deliberadamente separado de esSuperadmin, que
 * además da permiso para borrar registros reales, restaurar backups, etc.
 * Los superadmins ya tienen acceso por serlo; esta lista es solo para
 * cuentas a las que se les da Transferencias sin el resto de poderes de
 * superadmin. Petición del usuario, 2026-09-09: soporte@kelatos.com.
 */
const TRANSFERENCIAS_EMAILS_EXTRA = new Set(["soporte@kelatos.com"]);

export function puedeVerTransferencias(email: string | null | undefined): boolean {
  return esSuperadmin(email) || (!!email && TRANSFERENCIAS_EMAILS_EXTRA.has(email.toLowerCase()));
}
