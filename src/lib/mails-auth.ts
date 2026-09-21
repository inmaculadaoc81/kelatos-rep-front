import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";

/**
 * Acceso a las rutas de Gestión MAILS: administradores y superadmins pueden
 * VER; solo los superadmins pueden dar de alta, editar, probar o
 * sincronizar buzones (guardan contraseñas). Se comprueba también en el
 * backend y en src/proxy.ts.
 */
export async function accesoMails(): Promise<{ ok: true; email: string; superadmin: boolean } | { ok: false; respuesta: NextResponse }> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  const superadmin = esSuperadmin(email);
  if (!email || (session?.user?.role !== "admin" && !superadmin)) {
    return { ok: false, respuesta: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }) };
  }
  return { ok: true, email, superadmin };
}

export function soloSuperadmin(a: { superadmin: boolean }): NextResponse | null {
  return a.superadmin ? null : NextResponse.json({ ok: false, error: "Solo el superadmin puede gestionar los buzones" }, { status: 403 });
}
