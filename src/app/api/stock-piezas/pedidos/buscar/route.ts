import { NextRequest, NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";

export interface PedidoStockBusqueda {
  id: number;
  referencia: string;
  proveedor: string | null;
  enlace: string | null;
  cantidad: number;
  fecha_pedido: string;
  estado: string;
}

/** Proxy de GET /v1/stock-piezas/pedidos/buscar — usado por el picker de
    "Id de pedido de stock" del Libro de Compras. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const data = await kelatosApiGet<{ ok: boolean; pedidos: PedidoStockBusqueda[] }>(
      "/v1/stock-piezas/pedidos/buscar",
      { q: searchParams.get("q") ?? undefined }
    );
    return NextResponse.json({ ok: true, pedidos: data.pedidos });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
