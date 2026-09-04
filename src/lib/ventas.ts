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
  /** URL del PDF de la Factura real (Serie 1) — a diferencia del Ticket,
      nunca se sobrescribe: la rectificativa/corregida viven en sus propias
      columnas, la factura original sigue siendo consultable siempre. */
  urlFactura: string;
  fechaFactura: string | null;
  totalFactura: number;
  estadoFactura: string;
  formaPagoFactura: string;
  bancoFactura: string;
  /** Foto de las líneas y del cliente tal como se imprimieron en la
      Factura real vigente — permite reproducir la devolución exactamente,
      sin depender del estado actual (editable) del pedido. */
  lineasFactura: { descripcion: string; cantidad: number; precio: number; descuento: number }[];
  clienteFactura: { nombre: string; dni: string; telefono: string; direccion: string; email: string } | null;
  facturaRectificativa: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  motivoFacturaRectificativa: string;
  facturaCorregida: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  /** DNI/NIE/Pasaporte y firma (ID de Drive) registrados al confirmar la
      entrega vía el formulario público de QR — petición del usuario,
      2026-09-04. */
  dniEntrega: string;
  firmaEntregaUrl: string;
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
  url_factura: string | null;
  fecha_factura: string | null;
  total_factura: string | number | null;
  estado_factura: string | null;
  forma_pago_factura: string | null;
  banco_factura: string | null;
  lineas_factura: unknown;
  cliente_factura: unknown;
  numero_factura_rectificativa: string | null;
  url_factura_rectificativa: string | null;
  total_factura_rectificativa: string | number | null;
  fecha_factura_rectificativa: string | null;
  motivo_factura_rectificativa: string | null;
  numero_factura_corregida: string | null;
  url_factura_corregida: string | null;
  total_factura_corregida: string | number | null;
  fecha_factura_corregida: string | null;
  estado_factura_corregida: string | null;
  dni_entrega: string | null;
  firma_entrega_url: string | null;
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
    urlFactura: row.url_factura || "",
    fechaFactura: row.fecha_factura || null,
    totalFactura: Number(row.total_factura) || 0,
    estadoFactura: row.estado_factura || "",
    formaPagoFactura: row.forma_pago_factura || "",
    bancoFactura: row.banco_factura || "",
    lineasFactura: Array.isArray(row.lineas_factura)
      ? (row.lineas_factura as Array<{ descripcion?: string; cantidad?: number; precio?: number; descuento?: number }>).map((l) => ({
          descripcion: l.descripcion || "", cantidad: Number(l.cantidad) || 1, precio: Number(l.precio) || 0, descuento: Number(l.descuento) || 0,
        }))
      : [],
    clienteFactura: row.cliente_factura && typeof row.cliente_factura === "object"
      ? (() => {
          const c = row.cliente_factura as { nombre?: string; dni?: string; telefono?: string; direccion?: string; email?: string };
          return { nombre: c.nombre || "", dni: c.dni || "", telefono: c.telefono || "", direccion: c.direccion || "", email: c.email || "" };
        })()
      : null,
    facturaRectificativa: row.numero_factura_rectificativa
      ? { numeroFactura: row.numero_factura_rectificativa, urlFactura: row.url_factura_rectificativa || "", totalFactura: Number(row.total_factura_rectificativa) || 0, fechaFactura: row.fecha_factura_rectificativa || null }
      : null,
    motivoFacturaRectificativa: row.motivo_factura_rectificativa || "",
    facturaCorregida: row.numero_factura_corregida
      ? { numeroFactura: row.numero_factura_corregida, urlFactura: row.url_factura_corregida || "", totalFactura: Number(row.total_factura_corregida) || 0, fechaFactura: row.fecha_factura_corregida || null }
      : null,
    dniEntrega: row.dni_entrega || "",
    firmaEntregaUrl: row.firma_entrega_url || "",
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
// DNI y dirección del cliente no tienen su propia columna en `ventas` —
// solo se guardan como parte de la foto `cliente_factura` (migración 075,
// necesaria para poder rectificar/corregir la Factura real más tarde con
// los mismos datos fiscales), nunca sueltas en columnas propias. Cada línea
// de "Conceptos" en el original
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
  /** Tercera opción junto a Factura real y Garantía — venta pagada de
      verdad pero documentada con un Ticket de Venta (Serie 4, no fiscal)
      en vez de reservar un número de Factura real (Serie 1). Petición del
      usuario, 2026-08-28: "añade tickets también aquí". */
  modoTicket: boolean;
  clienteDni: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  clienteDireccion: string;
  formaPago: FormaPagoPedido | "";
  banco: string;
  estadoFactura: string;
  descuentoPct: number;
  observaciones: string;
  items: ItemPedidoForm[];
}

export interface ResultadoNuevoPedido {
  ventaId: string;
  numeroFactura: string;
  /** Solo presente cuando el pedido se generó en modoTicket. */
  numeroTicket: string;
  urlPdf: string;
}
