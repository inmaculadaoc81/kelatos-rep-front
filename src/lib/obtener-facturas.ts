import { kelatosApiGet } from "@/lib/kelatos-api";
import { FacturaCliente, expandirFacturas, expandirAlquiler, expandirManuales } from "@/lib/facturas-cliente";

interface RespuestaReparacionesFacturadas {
  ok: boolean;
  total: number;
  resultados: Parameters<typeof expandirFacturas>[0][];
}

interface RespuestaTabla<T> {
  ok: boolean;
  rows: T[];
}

/**
 * Reproduce la base común de apiObtenerFacturasClientes() (pasadas 1-11:
 * reparaciones + alquileres + facturas manuales) — usada tanto por
 * "Facturas de Clientes" como por "Reporte de Facturas" (que además añade
 * ventas encima de esta misma base, igual que el original).
 */
export async function obtenerTodasLasFacturas(): Promise<FacturaCliente[]> {
  const [reparaciones, alquileres, manuales] = await Promise.all([
    kelatosApiGet<RespuestaReparacionesFacturadas>("/v1/lecturas/reparaciones-facturadas"),
    kelatosApiGet<RespuestaTabla<Parameters<typeof expandirAlquiler>[0]>>("/v1/alquileres", { limit: 1000 }),
    kelatosApiGet<RespuestaTabla<Parameters<typeof expandirManuales>[0][number]>>("/v1/facturas_manuales", { limit: 1000 }),
  ]);

  return [
    ...reparaciones.resultados.flatMap(expandirFacturas),
    ...alquileres.rows.flatMap(expandirAlquiler),
    ...expandirManuales(manuales.rows),
  ];
}
