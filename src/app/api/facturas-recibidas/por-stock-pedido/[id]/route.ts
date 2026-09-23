import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearFacturaRecibida } from "@/lib/facturas-recibidas";

/** Facturas del Libro de Compras enlazadas a un pedido de stock. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; facturas: Parameters<typeof mapearFacturaRecibida>[0][] }>(
      `/v1/facturas-recibidas/por-stock-pedido/${encodeURIComponent(id)}`
    );
    return NextResponse.json({ ok: true, facturas: data.facturas.map(mapearFacturaRecibida) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
