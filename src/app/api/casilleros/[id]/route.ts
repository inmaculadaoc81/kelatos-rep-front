import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** PATCH /api/casilleros/[id] — edita contenido, capacidad, notas o lo activa/desactiva. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    await kelatosApiPost(`/v1/casilleros/${encodeURIComponent(id)}`, cuerpo, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
