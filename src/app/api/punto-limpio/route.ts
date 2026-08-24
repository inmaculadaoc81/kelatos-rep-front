import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearPuntoLimpio } from "@/lib/punto-limpio";

interface RespuestaLecturaPuntoLimpio {
  ok: boolean;
  resultados: Parameters<typeof mapearPuntoLimpio>[0][];
}

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaLecturaPuntoLimpio>("/v1/lecturas/punto-limpio");
    return NextResponse.json({ ok: true, items: data.resultados.map(mapearPuntoLimpio) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
