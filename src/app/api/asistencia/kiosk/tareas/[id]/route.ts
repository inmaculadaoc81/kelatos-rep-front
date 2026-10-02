import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearTarea } from "@/lib/tareas";

/** Detalle de una tarea propia (con sus avances e historial de diaria si
    aplica) — para el diálogo que se abre al tocar una tarea en el kiosco. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  try {
    const data = await kelatosApiGet<{ ok: boolean; tarea: Parameters<typeof mapearTarea>[0] }>(`/v1/tareas/kiosk/${empleadoId}/detalle/${id}`);
    return NextResponse.json({ ok: true, tarea: mapearTarea(data.tarea) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Editar/cambiar estado de UNA tarea propia — el backend comprueba que de
    verdad está asignada a este empleado antes de tocarla (403 si no). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  const datos = await req.json().catch(() => ({}));
  try {
    const data = await kelatosApiPost<{ ok: boolean; tarea: Parameters<typeof mapearTarea>[0] }>(
      `/v1/tareas/kiosk/${id}`,
      { ...datos, empleadoId },
      "PATCH"
    );
    return NextResponse.json({ ok: true, tarea: mapearTarea(data.tarea) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
