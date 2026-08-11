import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { expandirFacturas, expandirAlquiler, expandirManuales } from "@/lib/facturas-cliente";

interface RespuestaReparacionesFacturadas {
  ok: boolean;
  total: number;
  resultados: Parameters<typeof expandirFacturas>[0][];
}

interface RespuestaTabla<T> {
  ok: boolean;
  rows: T[];
}

export async function GET() {
  try {
    const [reparaciones, alquileres, manuales] = await Promise.all([
      kelatosApiGet<RespuestaReparacionesFacturadas>("/v1/lecturas/reparaciones-facturadas"),
      kelatosApiGet<RespuestaTabla<Parameters<typeof expandirAlquiler>[0]>>("/v1/alquileres", { limit: 1000 }),
      kelatosApiGet<RespuestaTabla<Parameters<typeof expandirManuales>[0][number]>>("/v1/facturas_manuales", { limit: 1000 }),
    ]);

    const facturas = [
      ...reparaciones.resultados.flatMap(expandirFacturas),
      ...alquileres.rows.flatMap(expandirAlquiler),
      ...expandirManuales(manuales.rows),
    ];

    return NextResponse.json({ ok: true, facturas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
