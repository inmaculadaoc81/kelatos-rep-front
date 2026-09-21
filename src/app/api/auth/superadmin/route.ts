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
  // Además de superadmin: quién puede entrar a Gestión MAILS (administradores y superadmins),
  // para decidir si se muestran los enlaces a esa vista.
  return NextResponse.json({ ok: true, esSuperadmin: superadmin, puedeVerMails: superadmin || session?.user?.role === "admin" });
}
