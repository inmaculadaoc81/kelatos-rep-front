import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";

/**
 * Indica si la sesión actual es una de las cuentas con permiso para borrar
 * registros desde el dashboard (reemplaza el borrado manual que antes se
 * hacía en Sheets). Solo lectura — la comprobación real de permiso vive en
 * cada ruta DELETE, esta ruta es únicamente para decidir si mostrar el
 * botón "Eliminar" en la interfaz.
 */
export async function GET() {
  const session = await auth();
  const superadmin = esSuperadmin(session?.user?.email);
  // "admin o superadmin" — mismo criterio que ya usaba puedeVerMails,
  // expuesto con un nombre genérico para reutilizarlo en otras vistas
  // admin-only (p. ej. corregir la forma de pago en Facturas de Clientes).
  const esAdmin = superadmin || session?.user?.role === "admin";
  return NextResponse.json({ ok: true, esSuperadmin: superadmin, esAdmin, puedeVerMails: esAdmin });
}
