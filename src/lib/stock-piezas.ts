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

function numero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
