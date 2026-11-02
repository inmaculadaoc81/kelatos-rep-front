import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { esSoloAsignadas, puedeGestionarContenido, puedeVerContenido } from "@/lib/contenido-acceso";

export async function GET() {
  const session = await auth();
  if (!puedeVerContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; piezas?: { asignadoId?: number | null }[] }>("/v1/contenido/piezas");
    if (esSoloAsignadas(session) && data.piezas) {
      data.piezas = data.piezas.filter((p) => p.asignadoId === session?.user?.asistenciaEmpleadoId);
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!puedeGestionarContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const data = await kelatosApiPost("/v1/contenido/piezas", { ...body, creadoPor: session?.user?.email ?? null });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
