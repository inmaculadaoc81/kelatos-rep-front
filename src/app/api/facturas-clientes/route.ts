import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { expandirFacturas } from "@/lib/facturas-cliente";

interface RespuestaReparacionesFacturadas {
  ok: boolean;
  total: number;
  resultados: Parameters<typeof expandirFacturas>[0][];
}

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaReparacionesFacturadas>("/v1/lecturas/reparaciones-facturadas");
    const facturas = data.resultados.flatMap(expandirFacturas);
    return NextResponse.json({ ok: true, facturas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
