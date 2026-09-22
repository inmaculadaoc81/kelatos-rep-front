import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Mi dispositivo remoto (si tengo uno vinculado) + si tengo una reunión
    abierta ahora mismo + el resumen de hoy (activo/inactivo/reunión). */
export async function GET() {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const data = await kelatosApiGet(`/v1/asistencia/remote-workers/mi-dispositivo`, { employeeId: String(empleadoId) });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
