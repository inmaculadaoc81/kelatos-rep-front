import { NextRequest, NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { CompraFila, KpisCompras, mapearCompra } from "@/lib/compras";

interface RespuestaCompras {
  ok: boolean;
  total: number;
  kpis: KpisCompras;
  compras: Parameters<typeof mapearCompra>[0][];
}

/** Proxy de GET /v1/compras — todos los pedidos de piezas de todas las reparaciones. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const data = await kelatosApiGet<RespuestaCompras>("/v1/compras", {
      estado: searchParams.get("estado") ?? undefined,
      retrasado: searchParams.get("retrasado") ?? undefined,
      proveedorId: searchParams.get("proveedorId") ?? undefined,
      compradoPor: searchParams.get("compradoPor") ?? undefined,
      busqueda: searchParams.get("busqueda") ?? undefined,
      fechaDesde: searchParams.get("fechaDesde") ?? undefined,
      fechaHasta: searchParams.get("fechaHasta") ?? undefined,
      orden: searchParams.get("orden") ?? undefined,
      pagina: searchParams.get("pagina") ?? "1",
      porPagina: searchParams.get("porPagina") ?? "50",
    });

    const compras: CompraFila[] = data.compras.map(mapearCompra);
    return NextResponse.json({ ok: true, compras, total: data.total, kpis: data.kpis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
