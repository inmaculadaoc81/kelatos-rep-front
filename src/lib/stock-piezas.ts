/**
 * Réplica de cargarStockPiezas()/filtrarStockPiezas() (Index.html) sobre
 * GET /v1/lecturas/stock-piezas — catálogo de piezas de repuesto, distinto
 * de "Productos e Inventario" (productos de venta, ver lib/productos.ts).
 */

interface FilaStockPiezaSql {
  referencia: string;
  nombre: string | null;
  descripcion: string | null;
  coste_interno: string | number | null;
  precio_cliente: string | number | null;
  mano_obra: string | number | null;
  stock_disponible: number | null;
  stock_minimo: number | null;
  proveedor: string | null;
  categoria: string | null;
  activo: boolean | null;
}

export interface StockPieza {
  referencia: string;
  nombre: string;
  descripcion: string;
  costeInterno: number;
  precioCliente: number;
  manoObra: number;
  /** (precioCliente + manoObra) * 1.21 — mismo cálculo que _spEuro()/total del original. */
  totalCliente: number;
  stockDisponible: number;
  stockMinimo: number;
  proveedor: string;
  categoria: string;
  activo: boolean;
  stockBajo: boolean;
}

export interface DatosStockPiezaForm {
  referencia: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  costeInterno: number;
  precioCliente: number;
  manoObra: number;
  proveedor: string;
  stockDisponible: number;
  stockMinimo: number;
  /** Resguardo de origen cuando la pieza procede de un reciclaje interno de Punto Limpio. */
  origenResguardo?: string;
}

function numero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface EnlaceCompra {
  id: number;
  referencia: string;
  proveedor: string;
  costo: number | null;
  enlace: string;
  fechaCreacion: string | null;
  usuario: string | null;
}

export type EstadoPedidoStock = "pendiente" | "recibido" | "cancelado";

export interface PedidoStock {
  id: number;
  referencia: string;
  enlaceId: number | null;
  proveedor: string;
  enlace: string;
  cantidad: number;
  fechaPedido: string | null;
  fechaEstimadaLlegada: string | null;
  estado: EstadoPedidoStock;
  fechaRecibido: string | null;
  usuario: string | null;
}

interface FilaEnlaceCompraSql {
  id: number;
  referencia: string;
  proveedor: string | null;
  costo: string | number | null;
  enlace: string;
  fecha_creacion: string | null;
  usuario: string | null;
}

interface FilaPedidoStockSql {
  id: number;
  referencia: string;
  enlace_id: number | null;
  proveedor: string | null;
  enlace: string | null;
  cantidad: number;
  fecha_pedido: string | null;
  fecha_estimada_llegada: string | null;
  estado: EstadoPedidoStock;
  fecha_recibido: string | null;
  usuario: string | null;
}

export function mapearEnlaceCompra(row: FilaEnlaceCompraSql): EnlaceCompra {
  return {
    id: row.id,
    referencia: row.referencia,
    proveedor: row.proveedor || "",
    costo: row.costo === null || row.costo === undefined ? null : numero(row.costo),
    enlace: row.enlace,
    fechaCreacion: row.fecha_creacion,
    usuario: row.usuario,
  };
}

export function mapearPedidoStock(row: FilaPedidoStockSql): PedidoStock {
  return {
    id: row.id,
    referencia: row.referencia,
    enlaceId: row.enlace_id,
    proveedor: row.proveedor || "",
    enlace: row.enlace || "",
    cantidad: numero(row.cantidad),
    fechaPedido: row.fecha_pedido,
    fechaEstimadaLlegada: row.fecha_estimada_llegada,
    estado: row.estado,
    fechaRecibido: row.fecha_recibido,
    usuario: row.usuario,
  };
}

export function mapearStockPieza(row: FilaStockPiezaSql): StockPieza {
  const precioCliente = numero(row.precio_cliente);
  const manoObra = numero(row.mano_obra);
  const stockDisponible = numero(row.stock_disponible);
  const stockMinimo = numero(row.stock_minimo);
  return {
    referencia: row.referencia,
    nombre: row.nombre || "",
    descripcion: row.descripcion || "",
    costeInterno: numero(row.coste_interno),
    precioCliente,
    manoObra,
    totalCliente: (precioCliente + manoObra) * 1.21,
    stockDisponible,
    stockMinimo,
    proveedor: row.proveedor || "",
    categoria: row.categoria || "",
    activo: row.activo !== false,
    stockBajo: stockMinimo > 0 && stockDisponible < stockMinimo,
  };
}
