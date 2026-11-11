import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { esCuentaEmpleadosRestringida } from "@/lib/superadmin";

export async function GET() {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const data = await kelatosApiGet<Record<string, unknown>>(`/v1/asistencia/kiosk/${empleadoId}/mi-info`);
    return NextResponse.json({ ...data, cuentaCompartida: esCuentaEmpleadosRestringida(session?.user?.email) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
