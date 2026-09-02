import { NextResponse, type NextRequest } from "next/server";
import { obtenerTodasLasFacturas } from "@/lib/obtener-facturas";
import { calcularDesglose } from "@/lib/reporte-facturas";
import { fechaMadrid } from "@/lib/reportes";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fechaDesde = searchParams.get("fechaDesde") || "";
  const fechaHasta = searchParams.get("fechaHasta") || "";
  if (!fechaDesde || !fechaHasta) {
    return NextResponse.json({ ok: false, error: "fechaDesde y fechaHasta son obligatorios" }, { status: 400 });
  }

  try {
    // Ventas ya viene incluida en obtenerTodasLasFacturas() desde la
    // migración 075 (antes se pedía y expandía aparte solo aquí, porque
    // "Facturas de Clientes" no las mostraba todavía).
    const todas = await obtenerTodasLasFacturas();

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
