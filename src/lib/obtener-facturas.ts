import { kelatosApiGet } from "@/lib/kelatos-api";
import { FacturaCliente, expandirFacturas, expandirFacturaHistorica, expandirAlquiler, expandirManuales } from "@/lib/facturas-cliente";

interface RespuestaReparacionesFacturadas {
  ok: boolean;
  total: number;
  resultados: Parameters<typeof expandirFacturas>[0][];
}

interface RespuestaFacturasHistoricas {
  ok: boolean;
  total: number;
  resultados: Parameters<typeof expandirFacturaHistorica>[0][];
}

interface RespuestaTabla<T> {
  ok: boolean;
  rows: T[];
}

interface FilaClienteLookup {
  codigo: string;
  dni_cif: string | null;
  telefono: string | null;
}

/**
 * Reproduce _lookupCodigo(dni, tel) del original — prioridad DNI, teléfono
 * como respaldo. apiObtenerFacturasClientes() lo aplica SIEMPRE a todas las
 * filas (nunca viene ya en el origen), así que aquí se hace igual, en vez
 * de solo cuando codigoCliente está vacío. Exportada para que
 * /api/reporte-facturas pueda aplicarla también a las ventas (que no pasan
 * por obtenerTodasLasFacturas) sin volver a pedir el listado de clientes.
 */
export async function lookupCodigoCliente(): Promise<(dni: string, telefono: string) => string> {
  const { clientes } = await kelatosApiGet<{ ok: boolean; clientes: FilaClienteLookup[] }>("/v1/lecturas/clientes", { limit: 5000 });
  const porDni = new Map<string, string>();
  const porTelefono = new Map<string, string>();
  for (const c of clientes) {
    const dni = (c.dni_cif || "").trim().toLowerCase();
    const tel = (c.telefono || "").trim();
    if (dni) porDni.set(dni, c.codigo);
    if (tel) porTelefono.set(tel, c.codigo);
  }
  return (dni, telefono) => porDni.get((dni || "").trim().toLowerCase()) || porTelefono.get((telefono || "").trim()) || "";
}

/**
 * Reproduce la base común de apiObtenerFacturasClientes() (pasadas 1-11:
 * reparaciones + alquileres + facturas manuales, más el lookup de
 * codigoCliente que se aplica al final a TODAS las filas) — usada tanto
 * por "Facturas de Clientes" como por "Reporte de Facturas" (que además
 * añade ventas encima de esta misma base, igual que el original).
 */
export async function obtenerTodasLasFacturas(): Promise<FacturaCliente[]> {
  const [reparaciones, historicas, alquileres, manuales, lookup] = await Promise.all([
    kelatosApiGet<RespuestaReparacionesFacturadas>("/v1/lecturas/reparaciones-facturadas"),
    kelatosApiGet<RespuestaFacturasHistoricas>("/v1/lecturas/reparaciones-facturas-historicas"),
    kelatosApiGet<RespuestaTabla<Parameters<typeof expandirAlquiler>[0]>>("/v1/alquileres", { limit: 1000 }),
    kelatosApiGet<RespuestaTabla<Parameters<typeof expandirManuales>[0][number]>>("/v1/facturas_manuales", { limit: 1000 }),
    lookupCodigoCliente(),
  ]);

  const facturas = [
    ...reparaciones.resultados.flatMap(expandirFacturas),
    ...historicas.resultados.map(expandirFacturaHistorica).filter((f): f is FacturaCliente => f !== null),
    ...alquileres.rows.flatMap(expandirAlquiler),
    ...expandirManuales(manuales.rows),
  ];

  return facturas.map((f) => ({ ...f, codigoCliente: lookup(f.dniCif, f.telefono) }));
}
