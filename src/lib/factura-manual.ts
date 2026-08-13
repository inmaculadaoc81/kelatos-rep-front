/**
 * Detalle de una factura manual (kelatos_app.facturas_manuales) — mapeo
 * equivalente a reparacion-detalle.ts, pero para el subsistema
 * independiente de facturas SIN resguardo de reparación (botón "Nueva
 * Factura Manual"). GET /v1/facturas-manuales/:id ya existe en el backend
 * (kelatos-rep-back) sin ningún llamador hasta ahora.
 */

export interface LineaFacturaManual {
  referencia?: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  descuento?: number;
}

interface FilaFacturaManualRaw {
  id: string;
  numero_factura: string | null;
  fecha_factura: string | null;
  cliente_nombre: string | null;
  cliente_dni: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  cliente_direccion: string | null;
  cliente_codigo: string | null;
  lineas_factura: unknown;
  forma_pago: string | null;
  banco: string | null;
  total_factura: string | number | null;
  url_factura: string | null;
  estado_factura: string | null;
  notas: string | null;
  // Nombre real de columna en la tabla — sin "ero" (num_, no numero_), a
  // diferencia de numero_factura_rectificativa en kelatos_app.reparaciones.
  num_factura_rectificativa: string | null;
  url_factura_rectificativa: string | null;
  total_factura_rectificativa: string | number | null;
  fecha_factura_rectificativa: string | null;
  motivo_rectificativa: string | null;
  fecha_creacion: string | null;
  numero_factura_corregida: string | null;
  url_factura_corregida: string | null;
  total_factura_corregida: string | number | null;
}

export interface FacturaManualDetalle {
  resguardo: string;
  numeroFactura: string;
  fechaFactura: string | null;
  cliente: { nombre: string; dni: string; telefono: string; email: string; direccion: string; codigo: string };
  lineasFactura: LineaFacturaManual[];
  formaPago: string;
  banco: string;
  totalFactura: number;
  urlFactura: string;
  estadoFactura: string;
  notas: string;
  rectificativa: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  motivoRectificativa: string;
  /** apiGenerarFacturaCorregidaManual crea además una fila NUEVA e
      independiente (su propio id "MANUAL-<numero>") para la corregida en
      sí — esto solo indica que YA existe (bloquea generar una segunda),
      con los datos justos para enlazar su PDF. */
  corregida: { numeroFactura: string; urlFactura: string; totalFactura: number } | null;
}

function numero(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}
function fecha(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

export function mapFacturaManualDetalle(row: FilaFacturaManualRaw): FacturaManualDetalle {
  return {
    resguardo: row.id,
    numeroFactura: row.numero_factura || "",
    fechaFactura: fecha(row.fecha_factura),
    cliente: {
      nombre: row.cliente_nombre || "",
      dni: row.cliente_dni || "",
      telefono: row.cliente_telefono || "",
      email: row.cliente_email || "",
      direccion: row.cliente_direccion || "",
      codigo: row.cliente_codigo || "",
    },
    lineasFactura: Array.isArray(row.lineas_factura)
      ? (row.lineas_factura as Array<{ referencia?: string; descripcion?: string; cantidad?: number; precio?: number; descuento?: number }>).map((l) => ({
          referencia: l.referencia || "", descripcion: l.descripcion || "", cantidad: numero(l.cantidad) || 1, precio: numero(l.precio), descuento: numero(l.descuento),
        }))
      : [],
    formaPago: row.forma_pago || "",
    banco: row.banco || "",
    totalFactura: numero(row.total_factura),
    urlFactura: row.url_factura || "",
    estadoFactura: row.estado_factura || "",
    notas: row.notas || "",
    rectificativa: row.num_factura_rectificativa
      ? {
          numeroFactura: row.num_factura_rectificativa,
          urlFactura: row.url_factura_rectificativa || "",
          totalFactura: numero(row.total_factura_rectificativa),
          fechaFactura: fecha(row.fecha_factura_rectificativa),
        }
      : null,
    motivoRectificativa: row.motivo_rectificativa || "",
    corregida: row.numero_factura_corregida
      ? { numeroFactura: row.numero_factura_corregida, urlFactura: row.url_factura_corregida || "", totalFactura: numero(row.total_factura_corregida) }
      : null,
  };
}
