import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearFacturaRecibida } from "@/lib/facturas-recibidas";

/** Facturas del Libro de Compras enlazadas a un pedido de servicio (Compras). */
export async function GET(_req: Request, { params }: { params: Promise<{ pedidoId: string }> }) {
  const { pedidoId } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; facturas: Parameters<typeof mapearFacturaRecibida>[0][] }>(
      `/v1/facturas-recibidas/por-pedido/${encodeURIComponent(pedidoId)}`
    );
    return NextResponse.json({ ok: true, facturas: data.facturas.map(mapearFacturaRecibida) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
