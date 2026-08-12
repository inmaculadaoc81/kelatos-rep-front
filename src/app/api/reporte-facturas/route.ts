import { NextResponse, type NextRequest } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { expandirVenta } from "@/lib/facturas-cliente";
import { obtenerTodasLasFacturas, lookupCodigoCliente } from "@/lib/obtener-facturas";
import { calcularDesglose } from "@/lib/reporte-facturas";

interface RespuestaTabla<T> {
  ok: boolean;
  rows: T[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fechaDesde = searchParams.get("fechaDesde") || "";
  const fechaHasta = searchParams.get("fechaHasta") || "";
  if (!fechaDesde || !fechaHasta) {
    return NextResponse.json({ ok: false, error: "fechaDesde y fechaHasta son obligatorios" }, { status: 400 });
  }

  try {
    const [base, ventas, lookupCodigo] = await Promise.all([
      obtenerTodasLasFacturas(),
      kelatosApiGet<RespuestaTabla<Parameters<typeof expandirVenta>[0]>>("/v1/ventas", { limit: 1000 }),
      lookupCodigoCliente(),
    ]);

    // Las ventas no pasan por obtenerTodasLasFacturas(), así que necesitan
    // su propio paso de lookup — igual que "Añadir codigoCliente a ventas"
    // en el original.
    const ventasFacturas = ventas.rows.flatMap(expandirVenta).map((f) => ({ ...f, codigoCliente: lookupCodigo(f.dniCif, f.telefono) }));
    const todas = [...base, ...ventasFacturas];

    const enRango = todas.filter((f) => !!f.fecha && f.fecha.slice(0, 10) >= fechaDesde && f.fecha.slice(0, 10) <= fechaHasta);
    enRango.sort((a, b) => (a.fecha! < b.fecha! ? -1 : a.fecha! > b.fecha! ? 1 : 0));

    const facturas = enRango.map(calcularDesglose);

    return NextResponse.json({ ok: true, fechaDesde, fechaHasta, facturas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
