import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { esCuentaEmpleadosRestringida } from "@/lib/superadmin";

export async function POST(req: Request) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  // La cuenta compartida del local no ficha: un empleado fichó con ella creyendo que era la suya (2026-11-11).
  if (esCuentaEmpleadosRestringida(session?.user?.email)) return NextResponse.json({ ok: false, error: "La cuenta compartida del local (soporte@kelatos.com) no sirve para fichar. Cierra sesión y entra con tu cuenta personal." }, { status: 403 });

  const body = (await req.json()) as { tipo?: string; firma?: string; observaciones?: string };
  const tipo = typeof body.tipo === "string" ? body.tipo : "";
  const firma = typeof body.firma === "string" ? body.firma : null;
  const observaciones = typeof body.observaciones === "string" ? body.observaciones : null;

  try {
    const data = await kelatosApiPost(`/v1/asistencia/kiosk/${empleadoId}/fichar-con-firma`, { tipo, firma, observaciones });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
