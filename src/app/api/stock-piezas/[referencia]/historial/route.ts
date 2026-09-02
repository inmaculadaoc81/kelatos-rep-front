import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

interface EventoHistorial {
  id: number;
  fecha_hora: string;
  usuario: string | null;
  descripcion: string;
}

export async function GET(_req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { referencia } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; historial: EventoHistorial[] }>(
      `/v1/stock_piezas/${encodeURIComponent(referencia)}/historial`
    );
    return NextResponse.json({ ok: true, historial: resultado.historial });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
