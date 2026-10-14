import { esSuperadmin, puedeVerTransferencias } from "@/lib/superadmin";
import { esDominioKelatos } from "@/lib/dominio-kelatos";

/**
 * Qué puede ver el asistente de ayuda según la cuenta. El asistente nunca debe dar más información que la que la
 * propia cuenta puede ver en el dashboard: se calcula con las MISMAS reglas que el menú (navegacion.tsx) y el
 * middleware (proxy.ts), y se aplica en dos sitios: aquí (qué fragmentos de código puede leer) y en el servidor
 * (qué tablas de la base de datos puede consultar, según las "áreas" que se le envían).
 *
 * Áreas: "todo" (administradores y superadmins) o una lista de: reparaciones, catalogos, stock, compras,
 * facturacion, informes, transferencias, tareas. Una lista vacía = esa cuenta no puede usar el asistente.
 * Si cambian los permisos de una vista en proxy.ts, hay que reflejarlo aquí.
 */
export interface UsuarioAsistente {
  email?: string | null;
  role?: string | null;
  accesoCompleto?: boolean | null;
  viaCredentials?: boolean | null;
  asistenciaEmpleadoId?: number | null;
}

export function areasAsistente(u: UsuarioAsistente | null | undefined): string[] {
  const email = u?.email;
  if (!u || !email) return [];
  if (esSuperadmin(email) || u.role === "admin") return ["todo"];
  // Empleado que solo ficha (kiosco de Asistencia): no entra a nada del dashboard.
  const esSoloAsistencia = u.asistenciaEmpleadoId != null && !u.accesoCompleto && (!!u.viaCredentials || !esDominioKelatos(email));
  if (esSoloAsistencia || !esDominioKelatos(email)) return [];
  const areas = ["reparaciones", "catalogos", "stock", "compras", "facturacion", "informes"];
  if (puedeVerTransferencias(email)) areas.push("transferencias");
  if (!u.accesoCompleto) areas.push("tareas"); // las cuentas accesoCompleto (soporte) no tienen Tareas
  return areas;
}

/**
 * Quién puede usar el asistente ahora mismo. Por ahora solo superadministradores; para abrirlo al resto basta con
 * cambiar esta función (por ejemplo a `areasAsistente(u).length > 0`): lo que cada cuenta ve ya está acotado.
 */
export function puedeUsarAsistente(u: UsuarioAsistente | null | undefined): boolean {
  return esSuperadmin(u?.email);
}

// Código de pantallas y lógica que solo pertenece a vistas de administrador. Un empleado sin ese acceso no debe
// recibir explicaciones sacadas de ahí.
const CODIGO_SOLO_ADMIN = [
  /^src\/app\/\(app\)\/(contabilidad|importaciones|reporte-resenas|admin|configuracion|facturas-recibidas)\//,
  /^src\/app\/(agentes|agentes-v2|webs-kelatos|mails|asistencia)\//,
  /^src\/app\/api\/(contabilidad|importaciones|agentes|agentes-v2|mails|admin|configuracion|resenas|asistencia|webs-kelatos|facturas-recibidas|libro-compras)\//,
  /^src\/components\/agentes-v2\//,
  /^src\/lib\/(contabilidad|agentes|agentes-v2|campanas|contenido|contenido-acceso|mails|mails-auth|mails-tipos|mails-image-token|remote-workers|asistencia-proxy|webs-kelatos|importaciones|leads-importar|libro-compras-csv|facturas-recibidas|admin-registros|resenas)\.ts$/,
];
const CODIGO_TAREAS = /^src\/(app\/(tareas|api\/tareas)\/|lib\/tareas\.ts$)/;
const CODIGO_TRANSFERENCIAS = /^src\/(app\/(transferencias|api\/transferencias)\/)/;

/** ¿Puede esta cuenta recibir fragmentos de este archivo del código? */
export function puedeLeerCodigo(ruta: string, areas: string[]): boolean {
  if (areas.includes("todo")) return true;
  if (ruta === "menu-admin") return false;
  if (/^docs\/asistente\/admin-/.test(ruta)) return false;
  if (CODIGO_SOLO_ADMIN.some((r) => r.test(ruta))) return false;
  if (!areas.includes("tareas") && CODIGO_TAREAS.test(ruta)) return false;
  if (!areas.includes("transferencias") && CODIGO_TRANSFERENCIAS.test(ruta)) return false;
  return true;
}
