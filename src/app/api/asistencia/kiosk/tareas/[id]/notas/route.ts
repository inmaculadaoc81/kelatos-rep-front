import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearTarea } from "@/lib/tareas";

/** Avance de progreso en una tarea propia (no diaria) — el backend
    comprueba que de verdad está asignada a este empleado (403 si no). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  const datos = await req.json().catch(() => ({}));
  try {
    const data = await kelatosApiPost<{ ok: boolean; tarea: Parameters<typeof mapearTarea>[0] }>(
      `/v1/tareas/kiosk/${id}/notas`,
      { ...datos, empleadoId }
    );
    return NextResponse.json({ ok: true, tarea: mapearTarea(data.tarea) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
