/**
 * Tipos para "Seguimiento Facturas" — gestión de facturas de COMPRA a
 * proveedores/eBay (no facturación a clientes). Tabla nativa SQL
 * kelatos_app.seguimiento_facturas (pk seguimiento_id, tras la migración
 * 020). Lectura vía CRUD genérico GET /v1/seguimiento_facturas; escritura
 * vía POST /v1/seguimiento_facturas/crear, PATCH .../:id/editar,
 * POST .../:id/eliminar (dedicados, transaccionales, payloadHash
 * obligatorio).
 */

export type EstadoFacturaRecibida = "PENDIENTE" | "OK" | "NO DISPONIBLE";

export interface SeguimientoFactura {
  seguimientoId: number;
  fecha: string | null;
  plataforma: string;
  proveedor: string;
  numeroPedido: string;
  modelo: string;
  importe: number;
  moneda: string;
  numeroFactura: string;
  estadoOrdenEbay: string;
  facturaRecibida: EstadoFacturaRecibida;
  observaciones: string;
  mensajeVendedor: string;
  facturaAdjunta: string;
  estadoFacturaEbay: string;
}

interface FilaSeguimientoSql {
  seguimiento_id: number;
  fecha: string | null;
  plataforma: string | null;
  proveedor: string | null;
  numero_pedido: string | null;
  modelo: string | null;
  importe: string | number | null;
  moneda: string | null;
  numero_factura: string | null;
  estado_orden_ebay: string | null;
  factura_recibida: string | null;
  observaciones: string | null;
  mensaje_vendedor: string | null;
  factura_adjunta: string | null;
  estado_factura_ebay: string | null;
}

export function mapearSeguimiento(row: FilaSeguimientoSql): SeguimientoFactura {
  return {
    seguimientoId: row.seguimiento_id,
    fecha: row.fecha || null,
    plataforma: row.plataforma || "",
    proveedor: row.proveedor || "",
    numeroPedido: row.numero_pedido || "",
    modelo: row.modelo || "",
    importe: Number(row.importe) || 0,
    moneda: row.moneda || "EUR",
    numeroFactura: row.numero_factura || "",
    estadoOrdenEbay: row.estado_orden_ebay || "",
    facturaRecibida: (row.factura_recibida as EstadoFacturaRecibida) || "PENDIENTE",
    observaciones: row.observaciones || "",
    mensajeVendedor: row.mensaje_vendedor || "",
    facturaAdjunta: row.factura_adjunta || "",
    estadoFacturaEbay: row.estado_factura_ebay || "",
  };
}

export interface DatosSeguimientoForm {
  fecha: string;
  plataforma: string;
  proveedor: string;
  numeroPedido: string;
  modelo: string;
  importe: number;
  moneda: string;
  numeroFactura: string;
  facturaRecibida: EstadoFacturaRecibida;
  observaciones: string;
}
