import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { esCuentaEmpleadosRestringida } from "@/lib/superadmin";

/** El employeeId sale SIEMPRE de la sesión, nunca del body — así nadie
    puede fichar en nombre de otro empleado manipulando la petición. */
export async function POST(req: Request) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  // La cuenta compartida del local no ficha: un empleado fichó con ella creyendo que era la suya (2026-11-11).
  if (esCuentaEmpleadosRestringida(session?.user?.email)) return NextResponse.json({ ok: false, error: "La cuenta compartida del local (soporte@kelatos.com) no sirve para fichar. Cierra sesión y entra con tu cuenta personal." }, { status: 403 });

  const body = (await req.json()) as { tipo?: string };
  const tipo = typeof body.tipo === "string" ? body.tipo : "";

  try {
    const data = await kelatosApiPost(`/v1/asistencia/kiosk/${empleadoId}/fichar`, { tipo });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
