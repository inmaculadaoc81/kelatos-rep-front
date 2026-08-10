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

function mapearItem(row: FilaItemVentaSql): ItemVenta {
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
