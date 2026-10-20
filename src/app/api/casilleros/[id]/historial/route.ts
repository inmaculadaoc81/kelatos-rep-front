import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import type { MovimientoCasillero } from "@/lib/casilleros";

/** GET /api/casilleros/[id]/historial — qué equipos han estado en ese casillero y cuándo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; casillero: { id: number; codigo: string; zona: string; contenido: string }; historial: MovimientoCasillero[] }>(`/v1/casilleros/${encodeURIComponent(id)}/historial`);
    return NextResponse.json({ ok: true, casillero: data.casillero, historial: data.historial });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
