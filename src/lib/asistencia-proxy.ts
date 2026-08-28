import { NextResponse } from "next/server";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Helpers compartidos por las rutas /api/asistencia/* — evita repetir la
 * comprobación de sesión (empleado propio vs. manager) en cada route.ts.
 * El employeeId SIEMPRE sale de la sesión, nunca del cliente.
 */

function errorJson(error: unknown) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
}

export async function kioskGet(segmento: string) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    return NextResponse.json(await kelatosApiGet(`/v1/asistencia/kiosk/${empleadoId}/${segmento}`));
  } catch (error) {
    return errorJson(error);
  }
}

export async function kioskPost(segmento: string, body: unknown) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/asistencia/kiosk/${empleadoId}/${segmento}`, body));
  } catch (error) {
    return errorJson(error);
  }
}

export async function esManagerSesion(): Promise<boolean> {
  const session = await auth();
  const email = session?.user?.email;
  return !!email && esDominioKelatos(email) && (session?.user?.role === "admin" || esSuperadmin(email));
}

export async function adminGet(path: string, params?: Record<string, string | undefined>) {
  if (!(await esManagerSesion())) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    return NextResponse.json(await kelatosApiGet(path, params));
  } catch (error) {
    return errorJson(error);
  }
}

export async function adminPost(path: string) {
  const session = await auth();
  if (!(await esManagerSesion())) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    return NextResponse.json(await kelatosApiPost(path, { usuario: session?.user?.email }));
  } catch (error) {
    return errorJson(error);
  }
}
