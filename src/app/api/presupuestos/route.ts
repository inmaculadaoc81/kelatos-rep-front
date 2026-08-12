import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearPresupuestoEnviado } from "@/lib/presupuestos-enviados";

interface RespuestaLista<T> {
  ok: boolean;
  rows: T[];
}

interface RespuestaFila<T> {
  ok: boolean;
  row: T;
}

/**
 * GET /api/presupuestos — reproduce apiObtenerPresupuestosEnviados():
 * presupuestos en estado "enviado", más recientes primero, con
 * cliente/equipo resueltos desde la reparación de cada uno. Usa las rutas
 * CRUD genéricas /v1/presupuestos y /v1/reparaciones/:resguardo — no hace
 * falta ningún endpoint dedicado nuevo en el backend.
 */
export async function GET() {
  try {
    const presupuestos = await kelatosApiGet<RespuestaLista<Parameters<typeof mapearPresupuestoEnviado>[0]>>("/v1/presupuestos", {
      estado: "enviado",
      order: "fecha_envio",
      direction: "desc",
      limit: 500,
    });

    const resguardosUnicos = [...new Set(presupuestos.rows.map((p) => p.resguardo).filter(Boolean))];
    const reparaciones = await Promise.all(
      resguardosUnicos.map((resguardo) =>
        kelatosApiGet<RespuestaFila<Parameters<typeof mapearPresupuestoEnviado>[1]>>(`/v1/reparaciones/${encodeURIComponent(resguardo)}`)
          .then((r) => [resguardo, r.row] as const)
          .catch(() => [resguardo, undefined] as const)
      )
    );
    const mapaReparaciones = new Map(reparaciones);

    const lista = presupuestos.rows.map((p) => mapearPresupuestoEnviado(p, mapaReparaciones.get(p.resguardo)));

    return NextResponse.json({ ok: true, presupuestos: lista });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
