import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { esSoloAsignadas, puedeGestionarContenido, puedeVerContenido } from "@/lib/contenido-acceso";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!puedeVerContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; pieza?: { asignadoId?: number | null } }>(`/v1/contenido/piezas/${encodeURIComponent(id)}`);
    if (esSoloAsignadas(session) && data.pieza?.asignadoId !== session?.user?.asistenciaEmpleadoId) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!puedeGestionarContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/contenido/piezas/${encodeURIComponent(id)}`, body, "PATCH"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!puedeGestionarContenido(session)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/contenido/piezas/${encodeURIComponent(id)}`, undefined, "DELETE"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
