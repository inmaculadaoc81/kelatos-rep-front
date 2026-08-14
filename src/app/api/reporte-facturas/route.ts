import { NextResponse, type NextRequest } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { expandirVenta } from "@/lib/facturas-cliente";
import { obtenerTodasLasFacturas, lookupCodigoCliente } from "@/lib/obtener-facturas";
import { calcularDesglose } from "@/lib/reporte-facturas";
import { fechaMadrid } from "@/lib/reportes";

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

    // f.fecha es timestamptz (ISO en UTC) para reparación/revisión/etc. —
    // truncar con slice(0,10) se queda con el día UTC, no el de Madrid, y
    // una factura generada pasada la medianoche española (p.ej. 00:21 del
    // día 15 == 22:21 UTC del día 14) quedaba fuera del rango o contada en
    // el día equivocado (mismo bug real que en Facturas de Clientes).
    const enRango = todas.filter((f) => {
      if (!f.fecha) return false;
      const dia = fechaMadrid(f.fecha);
      return !!dia && dia >= fechaDesde && dia <= fechaHasta;
    });
    enRango.sort((a, b) => (a.fecha! < b.fecha! ? -1 : a.fecha! > b.fecha! ? 1 : 0));

    const facturas = enRango.map(calcularDesglose);

    return NextResponse.json({ ok: true, fechaDesde, fechaHasta, facturas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
