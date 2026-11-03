import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  try {
    return NextResponse.json(await kelatosApiGet(`/v1/reciclaje/solicitudes/${encodeURIComponent(id)}`));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

/** Cambia el estado y/o las notas de seguimiento; la identidad sale de la sesión. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { estado?: string; notas?: string };
  try {
    return NextResponse.json(await kelatosApiPost(`/v1/reciclaje/solicitudes/${encodeURIComponent(id)}`, { estado: body.estado, notas: body.notas, usuario: session.user.email }, "PATCH"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
