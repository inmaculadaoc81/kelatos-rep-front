import { NextResponse } from "next/server";
import { auth } from "@/auth";

const SUPERADMIN_EMAIL = "kelatoscielo@gmail.com";

/**
 * Indica si la sesión actual es la única cuenta con permiso para borrar
 * registros desde el dashboard (reemplaza el borrado manual que antes se
 * hacía en Sheets). Solo lectura — la comprobación real de permiso vive en
 * cada ruta DELETE, esta ruta es únicamente para decidir si mostrar el
 * botón "Eliminar" en la interfaz.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  return NextResponse.json({ ok: true, esSuperadmin: email === SUPERADMIN_EMAIL });
}
