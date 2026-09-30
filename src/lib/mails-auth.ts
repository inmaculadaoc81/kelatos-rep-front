import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { Buzon } from "@/lib/mails";

/**
 * Acceso a las rutas de Gestión MAILS: administradores y superadmins pueden
 * VER; solo los superadmins pueden dar de alta, editar, probar o
 * sincronizar buzones (guardan contraseñas). Se comprueba también en el
 * backend y en src/proxy.ts.
 *
 * Cuentas accesoCompleto (migración 160, p.ej. soporte@kelatos.com) también
 * entran, pero con `accesoCompleto: true` — cada ruta que devuelve datos de
 * varios buzones/leads/etc. debe usar ese flag para recortar el resultado a
 * "Centro de mails" y su propio buzón (petición del usuario, 2026-09-30).
 * Nunca son superadmin por esta vía, así que soloSuperadmin() ya las bloquea
 * igual que a cualquier cuenta sin ese privilegio.
 */
export async function accesoMails(): Promise<
  { ok: true; email: string; superadmin: boolean; accesoCompleto: boolean } | { ok: false; respuesta: NextResponse }
> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  const superadmin = esSuperadmin(email);
  const accesoCompleto = !!session?.user?.accesoCompleto;
  if (!email || (session?.user?.role !== "admin" && !superadmin && !accesoCompleto)) {
    return { ok: false, respuesta: NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }) };
  }
  return { ok: true, email, superadmin, accesoCompleto };
}

export function soloSuperadmin(a: { superadmin: boolean }): NextResponse | null {
  return a.superadmin ? null : NextResponse.json({ ok: false, error: "Solo el superadmin puede gestionar los buzones" }, { status: 403 });
}

/**
 * IDs de buzón que una cuenta accesoCompleto puede ver (el/los que tengan su
 * mismo email) — `null` si la cuenta no está restringida (admin/superadmin,
 * sin recorte alguno). Las rutas que listan/leen mensajes, hilos o adjuntos
 * deben usarlo para recortar por su cuenta: el email no se saca nunca del
 * cuerpo/query de la petición (mismo criterio que el resto del proyecto).
 * Hoy no existe ningún buzón con el email de soporte@kelatos.com, así que
 * esa cuenta ve una lista vacía hasta que se configure.
 */
export async function buzonesPropios(a: { email: string; accesoCompleto: boolean }): Promise<number[] | null> {
  if (!a.accesoCompleto) return null;
  try {
    const data = await kelatosApiGet<{ ok: boolean; buzones: Buzon[] }>("/v1/mails/buzones");
    return data.buzones.filter((b) => b.email.toLowerCase() === a.email).map((b) => b.id);
  } catch {
    return [];
  }
}
