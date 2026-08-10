import { NextRequest, NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearFilaReparacion, RespuestaLecturasReparaciones } from "@/lib/reparaciones";

/**
 * GET /api/reparaciones — proxy server-side hacia
 * GET /v1/lecturas/reparaciones (API real, Node/Express en el VPS).
 * El token de autenticación vive solo aquí (server-side); el navegador
 * nunca lo ve. Replica exactamente lo que hace
 * kelatosApiBuscarReparacionesSql en Apps Script: pide las reparaciones
 * activas (finalizadas=false) sin paginar, y devuelve cada fila ya
 * mapeada a camelCase + enriquecida con pedidos/presupuesto aceptado.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const data = await kelatosApiGet<RespuestaLecturasReparaciones>("/v1/lecturas/reparaciones", {
      finalizadas: searchParams.get("finalizadas") ?? "false",
      pagina: searchParams.get("pagina") ?? "1",
      porPagina: searchParams.get("porPagina") ?? "0",
      busqueda: searchParams.get("busqueda") ?? undefined,
      fechaDesde: searchParams.get("fechaDesde") ?? undefined,
      fechaHasta: searchParams.get("fechaHasta") ?? undefined,
      factura: searchParams.get("factura") ?? undefined,
      estadoRecogida: searchParams.get("estadoRecogida") ?? undefined,
    });

    const resultados = data.resultados.map((row) =>
      mapearFilaReparacion(row, data.pedidosPorResguardo || {}, data.pptoAceptadoPorResguardo || {})
    );

    return NextResponse.json({ ok: true, resultados, total: data.total });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
