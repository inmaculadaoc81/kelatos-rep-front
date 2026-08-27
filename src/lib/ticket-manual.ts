/**
 * Detalle de un ticket manual (kelatos_app.tickets_manuales, migración
 * 055) — mapeo equivalente a factura-manual.ts, pero para "Ticket Manual"
 * (botón suelto, sin reparación ni venta asociada). A diferencia de una
 * factura manual, no tiene forma de pago — solo líneas libres y cliente
 * (nombre/dirección/DNI/teléfono/email, migración 059) para saber a quién
 * pertenece y a qué correo se envía.
 */

export interface LineaTicketManual {
  descripcion: string;
  cantidad: number;
  precio: number;
  descuento: number;
}

interface FilaTicketManualRaw {
  id: string;
  numero_ticket: string | null;
  fecha_ticket: string | null;
  lineas_ticket: unknown;
  total_ticket: string | number | null;
  url_ticket: string | null;
  estado_ticket: string | null;
  notas: string | null;
  creado_por: string | null;
  fecha_creacion: string | null;
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
  cliente_nombre: string | null;
  cliente_direccion: string | null;
  cliente_dni: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  forma_pago_ticket: string | null;
  banco_ticket: string | null;
}

export interface TicketManualDetalle {
  id: string;
  numeroTicket: string;
  fechaTicket: string | null;
  lineasTicket: LineaTicketManual[];
  totalTicket: number;
  urlTicket: string;
  estadoTicket: string;
  notas: string;
  rectificativa: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  motivoRectificativa: string;
  corregida: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  clienteNombre: string;
  clienteDireccion: string;
  clienteDni: string;
  clienteTelefono: string;
  clienteEmail: string;
  formaPagoTicket: string;
  bancoTicket: string;
}

function numero(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}
function fecha(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

export function mapTicketManualDetalle(row: FilaTicketManualRaw): TicketManualDetalle {
  // lineas_ticket se guarda como { __meta: {...}, items: [...] } al crear
  // (ver POST /v1/tickets-manuales) — el __meta.requestId es interno, solo
  // "items" son las líneas reales que se muestran/reutilizan.
  const crudo = row.lineas_ticket as { items?: unknown } | unknown[] | null;
  const items = Array.isArray(crudo) ? crudo : Array.isArray((crudo as { items?: unknown })?.items) ? (crudo as { items: unknown[] }).items : [];
  return {
    id: row.id,
    numeroTicket: row.numero_ticket || "",
    fechaTicket: fecha(row.fecha_ticket),
    // descuento (%) se guardaba en lineas_ticket pero este mapeo lo
    // descartaba — bug real reportado por el usuario: al generar un
    // Ticket Corregido, el descuento por línea del ticket original
    // desaparecía (0% en vez del real), dando un total distinto al PDF
    // original.
    lineasTicket: (items as Array<{ descripcion?: string; cantidad?: number; precio?: number; descuento?: number }>).map((l) => ({
      descripcion: l.descripcion || "", cantidad: numero(l.cantidad) || 1, precio: numero(l.precio), descuento: numero(l.descuento),
    })),
    totalTicket: numero(row.total_ticket),
    urlTicket: row.url_ticket || "",
    estadoTicket: row.estado_ticket || "",
    notas: row.notas || "",
    rectificativa: row.numero_ticket_rectificativa
      ? { numeroFactura: row.numero_ticket_rectificativa, urlFactura: row.url_ticket_rectificativa || "", totalFactura: numero(row.total_ticket_rectificativa), fechaFactura: fecha(row.fecha_ticket_rectificativa) }
      : null,
    motivoRectificativa: row.motivo_ticket_rectificativa || "",
    corregida: row.numero_ticket_corregida
      ? { numeroFactura: row.numero_ticket_corregida, urlFactura: row.url_ticket_corregida || "", totalFactura: numero(row.total_ticket_corregida), fechaFactura: fecha(row.fecha_ticket_corregida) }
      : null,
    clienteNombre: row.cliente_nombre || "",
    clienteDireccion: row.cliente_direccion || "",
    clienteDni: row.cliente_dni || "",
    clienteTelefono: row.cliente_telefono || "",
    clienteEmail: row.cliente_email || "",
    formaPagoTicket: row.forma_pago_ticket || "",
    bancoTicket: row.banco_ticket || "",
  };
}
