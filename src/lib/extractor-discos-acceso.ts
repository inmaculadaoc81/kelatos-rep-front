import { esSuperadmin } from "@/lib/superadmin";

/**
 * Extractor de discos de clientes (copia de datos en el propio navegador, sin subir nada al servidor). Petición del usuario, 2026-11-17:
 * lo ven Romer, Iván, Ricardo, la cuenta de soporte (mostrador) y los superadmins. Se usa en el menú, en proxy.ts y en la propia página.
 */
const EMPLEADOS = new Set([16, 17, 22, 24]); // Iván Gonzalez, Romer Ramirez, Soporte (mostrador), Ricardo (Asistencia)
const EMAILS = new Set(["ivan.gonzalez@kelatos.com", "romer.ramirez@kelatos.com", "ricardo@kelatos.com", "soporte@kelatos.com"]);

type Usuario = { email?: string | null; asistenciaEmpleadoId?: number | null } | null | undefined;

export function puedeVerExtractorDiscos(user: Usuario): boolean {
  if (!user?.email) return false;
  const email = user.email.toLowerCase();
  return esSuperadmin(email) || EMAILS.has(email) || (user.asistenciaEmpleadoId != null && EMPLEADOS.has(user.asistenciaEmpleadoId));
}
