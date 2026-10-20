import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * PUT /api/reparaciones/[resguardo]/casillero — asigna, cambia o quita el casillero de un equipo.
 * body: { casilleroId: number | null }. El servidor rechaza si el casillero está lleno o el equipo ya salió.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { resguardo } = await params;
  const datos = (await req.json().catch(() => ({}))) as { casilleroId?: number | null };
  const casilleroId = typeof datos.casilleroId === "number" ? datos.casilleroId : null;
  try {
    const r = await kelatosApiPost<{ ok: boolean; casillero: string | null }>(`/v1/reparaciones/${encodeURIComponent(resguardo)}/casillero`, { casilleroId, usuario }, "PUT");
    return NextResponse.json({ ok: true, casillero: r.casillero });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 409 });
  }
}
