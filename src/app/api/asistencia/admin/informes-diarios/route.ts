import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearInformeAdmin } from "@/lib/informes";

/** Todos los informes de texto de todos los empleados, filtrables por fecha/empleado. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const p = new URL(req.url).searchParams;
  const params: Record<string, string> = {};
  const fecha = p.get("fecha");
  const empleadoId = p.get("empleadoId");
  if (fecha) params.fecha = fecha;
  if (empleadoId) params.empleadoId = empleadoId;

  try {
    const data = await kelatosApiGet<{ ok: boolean; informes: Parameters<typeof mapearInformeAdmin>[0][] }>("/v1/asistencia/admin/informes-diarios", params);
    return NextResponse.json({ ok: true, informes: data.informes.map(mapearInformeAdmin) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
