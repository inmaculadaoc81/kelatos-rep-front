import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearRecogida } from "@/lib/recogidas";

interface RespuestaGenericaRecogidas {
  ok: boolean;
  rows: Parameters<typeof mapearRecogida>[0][];
}

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaGenericaRecogidas>("/v1/recogidas", {
      limit: 500,
      order: "fecha",
      direction: "desc",
    });
    return NextResponse.json({ ok: true, recogidas: data.rows.map(mapearRecogida) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
