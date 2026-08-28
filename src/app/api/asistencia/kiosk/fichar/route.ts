import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** El employeeId sale SIEMPRE de la sesión, nunca del body — así nadie
    puede fichar en nombre de otro empleado manipulando la petición. */
export async function POST(req: Request) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const body = (await req.json()) as { tipo?: string };
  const tipo = typeof body.tipo === "string" ? body.tipo : "";

  try {
    const data = await kelatosApiPost(`/v1/asistencia/kiosk/${empleadoId}/fichar`, { tipo });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
