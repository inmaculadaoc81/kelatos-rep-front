import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearMetricas, RespuestaMetricasSql } from "@/lib/metricas";

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaMetricasSql>("/v1/lecturas/metricas-dashboard");
    return NextResponse.json({ ok: true, metricas: mapearMetricas(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
