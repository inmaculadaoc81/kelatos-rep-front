import { NextResponse } from "next/server";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapearFilaReparacion, RespuestaLecturasReparaciones } from "@/lib/reparaciones";
import { lookupCodigoCliente } from "@/lib/obtener-facturas";

/**
 * GET /api/reporte-equipos — reproduce el data source de "Reporte Equipos"
 * (apiBuscarReparaciones({}, 1, 5000): TODAS las reparaciones, activas y
 * finalizadas, sin paginar) más el código de cliente, que en el original
 * ya venía puesto en cada fila ("reparaciones ya lo traen") pero en la
 * migración nunca se guardó como columna — se resuelve aquí con el mismo
 * lookup DNI→teléfono que ya usa /api/reporte-facturas.
 */
export async function GET() {
  try {
    const [data, lookupCodigo] = await Promise.all([
      kelatosApiGet<RespuestaLecturasReparaciones>("/v1/lecturas/reparaciones", {
        finalizadas: "",
        pagina: "1",
        porPagina: "0",
      }),
      lookupCodigoCliente(),
    ]);

    const resultados = data.resultados.map((row) => {
      const r = mapearFilaReparacion(row, data.pedidosPorResguardo || {}, data.pptoAceptadoPorResguardo || {});
      return { ...r, codigoCliente: lookupCodigo(r.dniCif, r.cliente.telefono) };
    });

    return NextResponse.json({ ok: true, resultados });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
