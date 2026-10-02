import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearTarea } from "@/lib/tareas";

/** "Mis tareas" del kiosco — solo las propias (el backend filtra por el
    empleado de la sesión, nunca por lo que mande el cliente). */
export async function GET() {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const data = await kelatosApiGet<{ ok: boolean; tareas: Parameters<typeof mapearTarea>[0][] }>(`/v1/tareas/kiosk/${empleadoId}`);
    return NextResponse.json({ ok: true, tareas: data.tareas.map(mapearTarea) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = await req.json().catch(() => ({}));
  try {
    const data = await kelatosApiPost<{ ok: boolean; tarea: Parameters<typeof mapearTarea>[0] }>("/v1/tareas/kiosk", { ...datos, empleadoId });
    return NextResponse.json({ ok: true, tarea: mapearTarea(data.tarea) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
