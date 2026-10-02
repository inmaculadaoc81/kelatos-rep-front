import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearInforme } from "@/lib/informes";

/** Informe del día del propio empleado (por defecto hoy, o ?fecha=YYYY-MM-DD
    para releer uno pasado) + su propio historial reciente. */
export async function GET(req: Request) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const fecha = new URL(req.url).searchParams.get("fecha") || undefined;
  try {
    const data = await kelatosApiGet<{ ok: boolean; informe: Parameters<typeof mapearInforme>[0] | null; mios: Parameters<typeof mapearInforme>[0][] }>(
      `/v1/asistencia/kiosk/${empleadoId}/informe`,
      { fecha }
    );
    return NextResponse.json({ ok: true, informe: data.informe ? mapearInforme(data.informe) : null, mios: data.mios.map(mapearInforme) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Guarda (crea o actualiza) el informe de una fecha — por defecto hoy. */
export async function PUT(req: Request) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = await req.json().catch(() => ({}));
  try {
    const data = await kelatosApiPost<{ ok: boolean; informe: Parameters<typeof mapearInforme>[0] }>(
      `/v1/asistencia/kiosk/${empleadoId}/informe`,
      datos,
      "PUT"
    );
    return NextResponse.json({ ok: true, informe: mapearInforme(data.informe) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
