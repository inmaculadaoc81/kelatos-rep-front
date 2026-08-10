/**
 * Tipos para "Control de Stock" (Productos + Movimientos de inventario) —
 * GET /v1/lecturas/productos, GET /v1/lecturas/inventario, POST /v1/productos
 * (crear), PATCH /v1/productos/:id (editar), POST /v1/inventario/movimientos.
 */

export interface Producto {
  id: string;
  nombre: string;
  referencia: string;
  categoria: string;
  stockActual: number;
  unidad: string;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  proveedor: string;
  ubicacion: string;
  notas: string;
  activo: boolean;
  fechaAlta: string | null;
  ultimaModificacion: string | null;
}

export type TipoMovimiento = "Entrada" | "Salida" | "Ajuste";

export interface MovimientoInventario {
  idMovimiento: string;
  fecha: string | null;
  tipo: TipoMovimiento;
  idProducto: string;
  producto: string;
  referencia: string;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  proveedorCliente: string;
  noDocumento: string;
  precioUnitario: number;
  total: number;
  notas: string;
  registradoPor: string;
}

interface FilaProductoSql {
  id: string;
  nombre: string | null;
  referencia: string | null;
  categoria: string | null;
  stock_actual: string | number | null;
  unidad: string | null;
  stock_minimo: string | number | null;
  precio_compra: string | number | null;
  precio_venta: string | number | null;
  proveedor: string | null;
  ubicacion: string | null;
  notas: string | null;
  activo: boolean | null;
  fecha_alta: string | null;
  ultima_modificacion: string | null;
}

interface FilaMovimientoSql {
  id_movimiento: string;
  fecha: string | null;
  tipo: string;
  id_producto: string;
  producto: string | null;
  referencia: string | null;
  cantidad: string | number | null;
  stock_anterior: string | number | null;
  stock_resultante: string | number | null;
  proveedor_cliente: string | null;
  no_documento: string | null;
  precio_unitario: string | number | null;
  total: string | number | null;
  notas: string | null;
  registrado_por: string | null;
}

export function mapearProducto(row: FilaProductoSql): Producto {
  return {
    id: row.id,
    nombre: row.nombre || "",
    referencia: row.referencia || "",
    categoria: row.categoria || "",
    stockActual: Number(row.stock_actual) || 0,
    unidad: row.unidad || "uds",
    stockMinimo: Number(row.stock_minimo) || 0,
    precioCompra: Number(row.precio_compra) || 0,
    precioVenta: Number(row.precio_venta) || 0,
    proveedor: row.proveedor || "",
    ubicacion: row.ubicacion || "",
    notas: row.notas || "",
    activo: row.activo !== false,
    fechaAlta: row.fecha_alta || null,
    ultimaModificacion: row.ultima_modificacion || null,
  };
}

export function mapearMovimiento(row: FilaMovimientoSql): MovimientoInventario {
  return {
    idMovimiento: row.id_movimiento,
    fecha: row.fecha || null,
    tipo: (row.tipo as TipoMovimiento) || "Entrada",
    idProducto: row.id_producto,
    producto: row.producto || "",
    referencia: row.referencia || "",
    cantidad: Number(row.cantidad) || 0,
    stockAnterior: Number(row.stock_anterior) || 0,
    stockResultante: Number(row.stock_resultante) || 0,
    proveedorCliente: row.proveedor_cliente || "",
    noDocumento: row.no_documento || "",
    precioUnitario: Number(row.precio_unitario) || 0,
    total: Number(row.total) || 0,
    notas: row.notas || "",
    registradoPor: row.registrado_por || "",
  };
}

export interface DatosProductoForm {
  nombre: string;
  referencia: string;
  categoria: string;
  stockActual: number;
  unidad: string;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  proveedor: string;
  ubicacion: string;
  notas: string;
}

export interface DatosMovimiento {
  tipo: TipoMovimiento;
  cantidad: number;
  proveedor: string;
  numeroDocumento: string;
  precioUnitario: number;
  total: number;
  notas: string;
}
