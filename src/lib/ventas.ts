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
  numeroTicket: string;
  urlTicket: string;
  totalTicket: number;
  estadoTicket: string;
  /** Líneas reales usadas al generar el ticket vigente (se sobrescriben
      en cada corregida) — permiten precargar el formulario de "Ticket
      Corregido" y reproducir cada línea en la Devolución, en vez de un
      resumen (migración 058). */
  lineasTicket: { descripcion: string; cantidad: number; precio: number; descuento: number; referencia?: string }[];
  ticketRectificativa: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  motivoTicketRectificativa: string;
  ticketCorregida: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  formaPagoTicket: string;
  bancoTicket: string;
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
  numero_ticket: string | null;
  url_ticket: string | null;
  total_ticket: string | number | null;
  estado_ticket: string | null;
  lineas_ticket: unknown;
  numero_ticket_rectificativa: string | null;
  url_ticket_rectificativa: string | null;
  total_ticket_rectificativa: string | number | null;
  fecha_ticket_rectificativa: string | null;
  motivo_ticket_rectificativa: string | null;
  numero_ticket_corregida: string | null;
  url_ticket_corregida: string | null;
  total_ticket_corregida: string | number | null;
  fecha_ticket_corregida: string | null;
  estado_ticket_corregida: string | null;
  forma_pago_ticket: string | null;
  banco_ticket: string | null;
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
    numeroTicket: row.numero_ticket || "",
    urlTicket: row.url_ticket || "",
    totalTicket: Number(row.total_ticket) || 0,
    estadoTicket: row.estado_ticket || "",
    lineasTicket: Array.isArray(row.lineas_ticket)
      ? (row.lineas_ticket as Array<{ descripcion?: string; cantidad?: number; precio?: number; descuento?: number; referencia?: string }>).map((l) => ({
          descripcion: l.descripcion || "", cantidad: Number(l.cantidad) || 1, precio: Number(l.precio) || 0, descuento: Number(l.descuento) || 0, referencia: l.referencia || "",
        }))
      : [],
    ticketRectificativa: row.numero_ticket_rectificativa
      ? { numeroFactura: row.numero_ticket_rectificativa, urlFactura: row.url_ticket_rectificativa || "", totalFactura: Number(row.total_ticket_rectificativa) || 0, fechaFactura: row.fecha_ticket_rectificativa || null }
      : null,
    motivoTicketRectificativa: row.motivo_ticket_rectificativa || "",
    ticketCorregida: row.numero_ticket_corregida
      ? { numeroFactura: row.numero_ticket_corregida, urlFactura: row.url_ticket_corregida || "", totalFactura: Number(row.total_ticket_corregida) || 0, fechaFactura: row.fecha_ticket_corregida || null }
      : null,
    formaPagoTicket: row.forma_pago_ticket || "",
    bancoTicket: row.banco_ticket || "",
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

// ── Nuevo Pedido (modalNuevoPedido / generarFacturaPedido) ──────────────
// DNI y dirección del cliente NUNCA se persisten en `ventas` (esa tabla no
// tiene esas columnas) — solo viajan una vez, dentro de la factura PDF que
// se genera al crear el pedido. Cada línea de "Conceptos" en el original
// (_npAddLinea) solo captura descripción/cantidad/precio unitario: NUNCA
// proveedor ni enlace (el propio código de generarFacturaPedido() lee
// `.np-prov`/`.np-enlace`, pero esos selectores no existen en el HTML que
// genera _npAddLinea — son campos muertos) ni costo (se guarda siempre a
// 0, se corrige después editando la pieza desde el detalle). Por fidelidad
// se reproduce ese comportamiento real, no el que el código sugiere que
// "debería" hacer.

export type FormaPagoPedido = "efectivo" | "tarjeta" | "transferencia" | "bizum";

export interface ItemPedidoForm {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface DatosNuevoPedido {
  esGarantia: boolean;
  clienteDni: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  clienteDireccion: string;
  formaPago: FormaPagoPedido | "";
  banco: string;
  descuentoPct: number;
  observaciones: string;
  items: ItemPedidoForm[];
}

export interface ResultadoNuevoPedido {
  ventaId: string;
  numeroFactura: string;
  urlPdf: string;
}
