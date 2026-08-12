import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearExportacion, DatosRegistrarExportacion } from "@/lib/reporte-facturas-exportaciones";

interface RespuestaLista {
  ok: boolean;
  rows: Parameters<typeof mapearExportacion>[0][];
}

/** Lista las últimas exportaciones — GET /v1/reporte_facturas_exportaciones (CRUD genérico), más reciente primero. */
export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaLista>("/v1/reporte_facturas_exportaciones", {
      order: "fecha_hora",
      direction: "desc",
      limit: 100,
    });
    return NextResponse.json({ ok: true, exportaciones: data.rows.map(mapearExportacion) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/**
 * Registra una exportación ya realizada (el CSV se genera en el navegador
 * y ya se descargó — esta llamada es solo la constancia, best-effort desde
 * el cliente). POST /v1/reporte_facturas_exportaciones (CRUD genérico).
 */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosRegistrarExportacion;

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; row: Parameters<typeof mapearExportacion>[0] }>("/v1/reporte_facturas_exportaciones", {
      usuario,
      fecha_desde: datos.fechaDesde,
      fecha_hasta: datos.fechaHasta,
      series: datos.series.join(", "),
      doc_desde: datos.docDesde,
      doc_hasta: datos.docHasta,
      filtro_texto: datos.filtroTexto || null,
      num_facturas: datos.numFacturas,
      total_exportado: datos.totalExportado,
    });
    return NextResponse.json({ ok: true, exportacion: mapearExportacion(resultado.row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
