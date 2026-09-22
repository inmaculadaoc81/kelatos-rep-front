import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function POST(req: Request) {
  const session = await auth();
  const empleadoId = session?.user?.asistenciaEmpleadoId;
  if (!empleadoId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { deviceId?: number };
  if (!Number.isInteger(body.deviceId)) return NextResponse.json({ ok: false, error: "deviceId no válido" }, { status: 400 });

  try {
    const data = await kelatosApiPost(`/v1/asistencia/remote-workers/mi-dispositivo/${body.deviceId}/reunion/iniciar`, {
      employeeId: empleadoId,
      usuario: session?.user?.email || "",
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
