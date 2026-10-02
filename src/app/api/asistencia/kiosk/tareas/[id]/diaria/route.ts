import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearTarea } from "@/lib/tareas";

/** Marcar/desmarcar una tarea diaria propia como hecha HOY. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  try {
    const data = await kelatosApiPost<{ ok: boolean; tarea: Parameters<typeof mapearTarea>[0] }>(
      `/v1/tareas/kiosk/${id}/diaria`,
      { empleadoId },
      "POST"
    );
    return NextResponse.json({ ok: true, tarea: mapearTarea(data.tarea) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  try {
    const data = await kelatosApiPost<{ ok: boolean; tarea: Parameters<typeof mapearTarea>[0] }>(
      `/v1/tareas/kiosk/${id}/diaria`,
      { empleadoId },
      "DELETE"
    );
    return NextResponse.json({ ok: true, tarea: mapearTarea(data.tarea) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
