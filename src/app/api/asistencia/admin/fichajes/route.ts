import { NextResponse } from "next/server";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

function esManager(email: string | null | undefined, role: string | undefined) {
  return !!email && esDominioKelatos(email) && (role === "admin" || esSuperadmin(email));
}

export async function GET(req: Request) {
  const session = await auth();
  if (!esManager(session?.user?.email, session?.user?.role)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || undefined;
  const desde = searchParams.get("desde") || undefined;
  const hasta = searchParams.get("hasta") || undefined;

  try {
    const data = await kelatosApiGet("/v1/asistencia/admin/fichajes", { employeeId, desde, hasta });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/**
 * Crear un fichaje a mano — la única vía hoy de completar una "marcación
 * olvidada" (se quitó la aprobación automática el 2026-09-11). Lo llama
 * el diálogo "Aprobar" de /asistencia/admin/marcaciones-olvidadas, y
 * también sirve para dar de alta un fichaje suelto sin pasar por ahí.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!esManager(session?.user?.email, session?.user?.role)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const input = (await req.json().catch(() => ({}))) as {
    employeeId?: number; checkIn?: string; checkOut?: string | null; tipoFichaje?: string; observaciones?: string;
  };
  try {
    const data = await kelatosApiPost("/v1/asistencia/admin/fichajes", {
      usuario: session?.user?.email,
      employeeId: input.employeeId,
      checkIn: input.checkIn,
      checkOut: input.checkOut || null,
      tipoFichaje: input.tipoFichaje,
      observaciones: input.observaciones || "",
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
