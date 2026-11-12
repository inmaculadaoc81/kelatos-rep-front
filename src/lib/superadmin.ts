/**
 * Cuentas con permiso para borrar registros reales del dashboard
 * (kelatos_app.reparaciones/clientes/alquileres/ventas/facturas_manuales)
 * — reemplaza el borrado manual que antes se hacía en Sheets. Restringido
 * a un conjunto explícito de cuentas, comprobado tanto aquí como en el
 * backend Node (ver SUPERADMIN_EMAIL en kelatos-rep-back/src/server.js,
 * que debe mantenerse en el mismo conjunto).
 */
export const SUPERADMIN_EMAILS = new Set(["kelatoscielo@gmail.com", "kelatosclaude2@gmail.com", "kelatosclaude1@gmail.com", "carlogfn@gmail.com"]);

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

/**
 * Acceso de SOLO LECTURA a "Efectivo y caja" dentro de Contabilidad —
 * ninguna otra sección del módulo, y sin poder clasificar movimientos
 * (eso sigue siendo solo para admins/superadmins). Petición del usuario,
 * 2026-10-05: soporte@kelatos.com.
 */
const EFECTIVO_SOLO_LECTURA_EMAILS_EXTRA = new Set(["soporte@kelatos.com"]);

export function puedeVerEfectivoSoloLectura(email: string | null | undefined): boolean {
  return !!email && EFECTIVO_SOLO_LECTURA_EMAILS_EXTRA.has(email.toLowerCase());
}

/**
 * Cuenta compartida de empleados (soporte@kelatos.com): puede consultar
 * Control de Stock pero NO crear/editar productos, y no puede usar "Subir
 * pedido con IA" en Compras. Petición del usuario, 2026-10-13. Se comprueba
 * en la UI (oculta los botones) y en las rutas /api que escriben (403).
 */
const CUENTAS_EMPLEADOS_RESTRINGIDAS = new Set(["soporte@kelatos.com"]);

export function esCuentaEmpleadosRestringida(email: string | null | undefined): boolean {
  return !!email && CUENTAS_EMPLEADOS_RESTRINGIDAS.has(email.toLowerCase());
}

/**
 * Accesos de Telegram del grupo de transferencias (quién puede subir comprobantes y como «Cliente» o «Empresa»): solo una cuenta puede verlos
 * y cambiarlos. Petición del usuario, 2026-11-03: kelatosclaude2@gmail.com.
 */
const ACCESOS_TELEGRAM_EMAIL = "kelatosclaude2@gmail.com";

export function puedeGestionarAccesosTelegram(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ACCESOS_TELEGRAM_EMAIL;
}

/**
 * Alta de piezas nuevas en Stock de piezas (botón «Nueva Pieza»): superadmins y las cuentas de esta lista. Petición del usuario, 2026-11-04:
 * ricardo@kelatos.com puede crear productos nuevos (el resto de cuentas como soporte no). Solo decide si se ve el botón; editar y borrar siguen
 * siendo de superadmin.
 */
const CREAR_PIEZAS_EMAILS_EXTRA = new Set(["ricardo@kelatos.com"]);

export function puedeCrearPiezas(email: string | null | undefined): boolean {
  return esSuperadmin(email) || (!!email && CREAR_PIEZAS_EMAILS_EXTRA.has(email.toLowerCase()));
}

/**
 * Editar una pieza de Stock de piezas (nombre, precios, stock disponible y mínimo): superadmins y las cuentas de esta lista. Petición del usuario,
 * 2026-11-12: ricardo@kelatos.com también puede EDITAR, y nada más (borrar piezas y añadir enlaces siguen siendo solo de superadmin).
 */
const EDITAR_PIEZAS_EMAILS_EXTRA = new Set(["ricardo@kelatos.com"]);

export function puedeEditarPiezas(email: string | null | undefined): boolean {
  return esSuperadmin(email) || (!!email && EDITAR_PIEZAS_EMAILS_EXTRA.has(email.toLowerCase()));
}

/**
 * Cuentas que, al entrar, aterrizan en el FICHAJE (como antes de tener acceso completo) y desde ahí pasan al dashboard con el botón «Ir al dashboard».
 * Petición del usuario, 2026-11-04: Iván, Romer y Ricardo. La cookie COOKIE_IR_DASHBOARD la pone ese botón y dura lo que dure la jornada.
 */
const FICHAJE_PRIMERO_EMAILS = new Set(["ivan.gonzalez@kelatos.com", "romer.ramirez@kelatos.com", "ricardo@kelatos.com"]);
export const COOKIE_IR_DASHBOARD = "kelatos_dashboard";

export function aterrizaEnFichaje(email: string | null | undefined): boolean {
  return !!email && FICHAJE_PRIMERO_EMAILS.has(email.toLowerCase());
}
