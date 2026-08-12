/**
 * Tipos para "Pedidos de piezas (ventas)" — gestión de pedidos de piezas a
 * clientes sin reparación asociada. GET /v1/lecturas/ventas,
 * POST /v1/ventas (crear), PATCH /v1/ventas/:ventaId (editar cabecera).
 */

export type EstadoItemVenta = "Pieza Pendiente" | "En Tránsito" | "Pieza Recibida" | "Entregado" | "Cancelado";

export interface ItemVenta {
  itemId: string;
  ventaId: string;
  descripcion: string;
  costo: number;
  precio: number;
  proveedorId: string;
  proveedorNombre: string;
  numeroPedido: string;
  enlace: string;
  fechaPedido: string | null;
  fechaEstimada: string | null;
  fechaRecepcion: string | null;
  estadoPedido: string;
  recibidoPor: string;
  notas: string;
}

export interface Venta {
  ventaId: string;
  fecha: string | null;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  estado: string;
  estadoPago: string;
  fechaEntrega: string | null;
  observaciones: string;
  creadoPor: string;
  ultimoUsuario: string;
  montoPagado: number;
  numeroFactura: string;
  items: ItemVenta[];
}

interface FilaVentaSql {
  venta_id: string;
  fecha: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  estado: string | null;
  estado_pago: string | null;
  fecha_entrega: string | null;
  observaciones: string | null;
  creado_por: string | null;
  ultimo_usuario: string | null;
  monto_pagado: string | number | null;
  numero_factura: string | null;
}

interface FilaItemVentaSql {
  item_id: string;
  venta_id: string;
  descripcion: string | null;
  costo: string | number | null;
  precio: string | number | null;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  numero_pedido: string | null;
  enlace: string | null;
  fecha_pedido: string | null;
  fecha_estimada: string | null;
  fecha_recepcion: string | null;
  estado_pedido: string | null;
  recibido_por: string | null;
  notas: string | null;
}

export function mapearItem(row: FilaItemVentaSql): ItemVenta {
  return {
    itemId: row.item_id,
    ventaId: row.venta_id,
    descripcion: row.descripcion || "",
    costo: Number(row.costo) || 0,
    precio: Number(row.precio) || 0,
    proveedorId: row.proveedor_id || "",
    proveedorNombre: row.proveedor_nombre || "",
    numeroPedido: row.numero_pedido || "",
    enlace: row.enlace || "",
    fechaPedido: row.fecha_pedido || null,
    fechaEstimada: row.fecha_estimada || null,
    fechaRecepcion: row.fecha_recepcion || null,
    estadoPedido: row.estado_pedido || "",
    recibidoPor: row.recibido_por || "",
    notas: row.notas || "",
  };
}

export function mapearVenta(row: FilaVentaSql, items: FilaItemVentaSql[]): Venta {
  return {
    ventaId: row.venta_id,
    fecha: row.fecha || null,
    clienteNombre: row.cliente_nombre || "",
    clienteTelefono: row.cliente_telefono || "",
    clienteEmail: row.cliente_email || "",
    estado: row.estado || "",
    estadoPago: row.estado_pago || "",
    fechaEntrega: row.fecha_entrega || null,
    observaciones: row.observaciones || "",
    creadoPor: row.creado_por || "",
    ultimoUsuario: row.ultimo_usuario || "",
    montoPagado: Number(row.monto_pagado) || 0,
    numeroFactura: row.numero_factura || "",
    items: items.map(mapearItem),
  };
}

export interface ItemVentaForm {
  descripcion: string;
  costo: number;
  precio: number;
  proveedorId: string;
  enlace: string;
  notas: string;
}

export interface DatosNuevaVenta {
  esGarantia: boolean;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  numeroFactura: string;
  metodoPago: string;
  banco: string;
  observaciones: string;
  items: ItemVentaForm[];
}

export interface DatosEditarVenta {
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  observaciones: string;
  estado: string;
  estadoPago: string;
}

/** Reproduce _badgeEstadoVenta() del original — "Garantía" (estado_pago,
    no `estado`) manda sobre el estado normal del pedido, y "Pieza
    Pendiente" se relabela a "Pedido Pendiente" solo para mostrar. */
export const ESTILO_ESTADO_VENTA: Record<string, { bg: string; color?: string }> = {
  "Pieza Pendiente": { bg: "#fd7e14" },
  "En Tránsito": { bg: "#ffc107", color: "#212529" },
  "Pieza Recibida": { bg: "#20c997" },
  Entregado: { bg: "#28a745" },
  Cancelado: { bg: "#dc3545" },
  Garantía: { bg: "#0d6efd" },
};

export function estadoVentaMostrado(venta: Pick<Venta, "estado" | "estadoPago">): { estado: string; texto: string; estilo: { bg: string; color?: string } } {
  const estado = venta.estadoPago === "Garantía" ? "Garantía" : venta.estado || "Pieza Pendiente";
  const texto = estado === "Pieza Pendiente" ? "Pedido Pendiente" : estado;
  return { estado, texto, estilo: ESTILO_ESTADO_VENTA[estado] || { bg: "#6c757d" } };
}

export const ESTILO_ESTADO_ITEM_VENTA: Record<string, { bg: string; color?: string }> = {
  "Pieza Pendiente": { bg: "#fd7e14" },
  "En Tránsito": { bg: "#ffc107", color: "#212529" },
  "Pieza Recibida": { bg: "#20c997" },
  Problema: { bg: "#dc3545" },
};

export interface DatosNuevoItem {
  descripcion: string;
  costo: number;
  precio: number;
  proveedorId: string;
  enlace: string;
}

export interface DatosEditarItem {
  descripcion: string;
  costo: number;
  precio: number;
}

export interface DatosRegistrarPedido {
  proveedorId: string;
  numeroPedido: string;
  fechaEstimada: string;
  enlace: string;
}

/** Reproduce `numsPedido.join(', ')` de renderizarTablaVentas() — una venta
    puede tener varias piezas pedidas a la vez, cada una con su propio nº. */
export function numerosPedidoDeVenta(venta: Pick<Venta, "items">): string {
  const nums = venta.items.map((i) => i.numeroPedido).filter(Boolean);
  return nums.length ? nums.join(", ") : "-";
}
