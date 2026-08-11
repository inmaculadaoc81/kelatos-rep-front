import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearStockPieza } from "@/lib/stock-piezas";

interface RespuestaStockPiezas {
  ok: boolean;
  piezas: Parameters<typeof mapearStockPieza>[0][];
}

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaStockPiezas>("/v1/lecturas/stock-piezas");
    return NextResponse.json({ ok: true, piezas: data.piezas.map(mapearStockPieza) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
