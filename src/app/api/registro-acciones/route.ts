import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearEventoRegistro } from "@/lib/registro-acciones";

interface RespuestaHistorial {
  ok: boolean;
  registros: Parameters<typeof mapearEventoRegistro>[0][];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const data = await kelatosApiGet<RespuestaHistorial>("/v1/lecturas/historial", {
      busqueda: searchParams.get("busqueda") || undefined,
      fechaDesde: searchParams.get("fechaDesde") || undefined,
      fechaHasta: searchParams.get("fechaHasta") || undefined,
      pagina: searchParams.get("pagina") || undefined,
      porPagina: 200,
    });
    return NextResponse.json({
      ok: true,
      eventos: data.registros.map(mapearEventoRegistro),
      total: data.total,
      pagina: data.pagina,
      totalPaginas: data.totalPaginas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
