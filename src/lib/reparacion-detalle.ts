/**
 * Tipos y mapeo del detalle completo de una reparación — replica el
 * contrato de obtenerReparacionSqlParalela / _mapearFilaReparacionSql /
 * _kelatosApiMapearPresupuesto / _kelatosApiMapearPieza /
 * _kelatosApiMapearPedido / _kelatosApiMapearHistorial (DatabaseApi.js).
 * Usado por el modal de detalle de reparación.
 */

function numero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fecha(v: unknown): string | null {
  return v ? String(v) : null;
}

function json(v: unknown): string {
  return v !== null && v !== undefined ? JSON.stringify(v) : "";
}

interface ClienteFacturaObj {
  nombre: string;
  direccion: string;
  dni: string;
  telefono: string;
  email: string;
  codigo?: string;
}

/** cliente_factura (reparación) es jsonb y llega ya parseado como objeto,
    pero cliente_factura_revision/_mensajeria/_corregida son columnas
    `text` que guardan el mismo JSON como string sin parsear — node-postgres
    no las convierte solas. Comprobar `typeof === "object"` (como se hacía
    antes) descarta siempre esas tres, así que una factura de revisión,
    mensajería o corregida con "Cliente en la factura" distinto al del
    resguardo generaba su devolución/rectificativa a nombre y con el código
    de cliente del resguardo, no de la persona real de esa factura (bug real
    reportado). Mismo parseo que aplicarClienteFactura() en facturas-cliente.ts. */
function clienteFacturaObj(v: unknown): ClienteFacturaObj | null {
  let o: Record<string, unknown> | null = null;
  if (v && typeof v === "object") {
    o = v as Record<string, unknown>;
  } else if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object") o = parsed;
    } catch {
      o = null;
    }
  }
  const nombre = o?.nombre != null ? String(o.nombre).trim() : "";
  if (!nombre) return null;
  return {
    nombre,
    direccion: o?.direccion != null ? String(o.direccion).trim() : "",
    dni: o?.dni != null ? String(o.dni).trim() : "",
    telefono: o?.telefono != null ? String(o.telefono).trim() : "",
    email: o?.email != null ? String(o.email).trim() : "",
    ...(o?.codigo ? { codigo: String(o.codigo).trim() } : {}),
  };
}

// -- Filas crudas (snake_case) tal como las devuelven las rutas genéricas
// GET /v1/:table y GET /v1/:table/:id del API real. --

interface FilaReparacionSqlDetalle {
  resguardo: string;
  fecha_recepcion: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  direccion_envio: string | null;
  equipo_modelo: string | null;
  sintoma: string | null;
  estado: string | null;
  presupuesto_aceptado_id: string | null;
  tecnico_asignado: string | null;
  fecha_reparacion: string | null;
  resultado_reparacion: string | null;
  numero_factura: string | null;
  url_factura: string | null;
  fecha_factura: string | null;
  numero_ticket: string | null;
  url_ticket: string | null;
  fecha_ticket: string | null;
  estado_ticket: string | null;
  total_ticket: string | number | null;
  numero_ticket_revision: string | null;
  url_ticket_revision: string | null;
  fecha_ticket_revision: string | null;
  total_ticket_revision: string | number | null;
  estado_ticket_revision: string | null;
  lineas_ticket: unknown;
  lineas_ticket_revision: unknown;
  numero_ticket_rectificativa: string | null;
  url_ticket_rectificativa: string | null;
  total_ticket_rectificativa: string | number | null;
  fecha_ticket_rectificativa: string | null;
  motivo_ticket_rectificativa: string | null;
  numero_ticket_corregida: string | null;
  url_ticket_corregida: string | null;
  total_ticket_corregida: string | number | null;
  fecha_ticket_corregida: string | null;
  numero_ticket_revision_rectificativa: string | null;
  url_ticket_revision_rectificativa: string | null;
  total_ticket_revision_rectificativa: string | number | null;
  fecha_ticket_revision_rectificativa: string | null;
  motivo_ticket_revision_rectificativa: string | null;
  numero_ticket_revision_corregida: string | null;
  url_ticket_revision_corregida: string | null;
  total_ticket_revision_corregida: string | number | null;
  fecha_ticket_revision_corregida: string | null;
  resena: string | null;
  fecha_entrega: string | null;
  estado_entrega: string | null;
  firma_recogida_url: string | null;
  tipo_recepcion: string | null;
  equipo_en_local: string | null;
  entrega_mensajeria: string | null;
  dni_cif: string | null;
  motivo_sin_reparacion: string | null;
  tipo_ingreso: string | null;
  revision_pagada: boolean | null;
  numero_factura_revision: string | null;
  url_factura_revision: string | null;
  cliente_factura_revision: unknown;
  ultimo_usuario: string | null;
  presupuestos_modo: string | null;
  datos_cintas: unknown;
  observaciones: string | null;
  creado_por: string | null;
  fecha_creacion: string | null;
  total_factura: string | number | null;
  forma_pago: string | null;
  banco: string | null;
  estado_factura: string | null;
  factura_borrador: boolean | null;
  cliente_factura: unknown;
  codigo_cliente: string | null;
  anticipo_importe: string | number | null;
  numero_factura_anticipo: string | null;
  url_factura_anticipo: string | null;
  numero_ticket_anticipo: string | null;
  url_ticket_anticipo: string | null;
  fecha_ticket_anticipo: string | null;
  total_ticket_anticipo: string | number | null;
  estado_ticket_anticipo: string | null;
  forma_pago_ticket: string | null;
  banco_ticket: string | null;
  forma_pago_ticket_revision: string | null;
  banco_ticket_revision: string | null;
  forma_pago_ticket_anticipo: string | null;
  banco_ticket_anticipo: string | null;
  cliente_email_ticket: string | null;
  cliente_email_ticket_revision: string | null;
  cliente_email_ticket_anticipo: string | null;
  numero_factura_mensajeria: string | null;
  url_factura_mensajeria: string | null;
  total_factura_mensajeria: string | number | null;
  cliente_factura_mensajeria: unknown;
  numero_ticket_mensajeria: string | null;
  url_ticket_mensajeria: string | null;
  total_ticket_mensajeria: string | number | null;
  forma_pago_ticket_mensajeria: string | null;
  banco_ticket_mensajeria: string | null;
  cliente_email_ticket_mensajeria: string | null;
  lineas_factura: unknown;
  numero_factura_rectificativa: string | null;
  url_factura_rectificativa: string | null;
  total_factura_rectificativa: string | number | null;
  fecha_factura_rectificativa: string | null;
  numero_factura_rectificativa_revision: string | null;
  url_factura_rectificativa_revision: string | null;
  total_factura_rectificativa_revision: string | number | null;
  fecha_factura_rectificativa_revision: string | null;
  motivo_rectificativa: string | null;
  estado_factura_rectificativa: string | null;
  numero_factura_corregida: string | null;
  url_factura_corregida: string | null;
  total_factura_corregida: string | number | null;
  fecha_factura_corregida: string | null;
  numero_factura_corregida_revision: string | null;
  url_factura_corregida_revision: string | null;
  total_factura_corregida_revision: string | number | null;
  fecha_factura_corregida_revision: string | null;
  cliente_factura_corregida: unknown;
  lineas_factura_corregida: unknown;
}

interface FilaPiezaSql {
  pieza_id: string;
  presupuesto_id: string;
  proveedor_id: string | null;
  descripcion: string | null;
  costo: string | number | null;
  precio: string | number | null;
  enlace: string | null;
  notas: string | null;
  tipo: string | null;
  referencia_stock: string | null;
}

interface FilaPresupuestoSql {
  presupuesto_id: string;
  resguardo: string;
  version: string | number | null;
  fecha_elaboracion: string | null;
  elaborado_por: string | null;
  mano_obra: string | number | null;
  costo_reparacion: string | number | null;
  costo_piezas: string | number | null;
  precio_piezas: string | number | null;
  total: string | number | null;
  ganancia_neta: string | number | null;
  dias_entrega: string | number | null;
  estado: string | null;
  fecha_envio: string | null;
  fecha_respuesta: string | null;
  motivo_rechazo: string | null;
  notas: string | null;
  tipo_pieza: string | null;
  descripcion: string | null;
  numero_presupuesto: string | null;
  url_pdf_presupuesto: string | null;
}

interface FilaPedidoSql {
  pedido_id: string;
  pieza_id: string | null;
  resguardo: string;
  comprado_por: string | null;
  numero_pedido: string | null;
  fecha_pedido: string | null;
  fecha_estimada: string | null;
  fecha_recepcion: string | null;
  estado: string | null;
  recibido_por: string | null;
  problema_tipo: string | null;
  codigo_devolucion: string | null;
  pedido_remplazo_id: string | null;
  notas: string | null;
  enlace: string | null;
  proveedor_id: string | null;
}

interface FilaHistorialSql {
  evento_id: string;
  resguardo: string;
  fecha_hora: string | null;
  empleado_id: string | null;
  tipo: string | null;
  descripcion: string | null;
  datos_extra: unknown;
}

// -- Tipos mapeados (camelCase), consumidos por la UI. --

export interface Pieza {
  piezaId: string;
  presupuestoId: string;
  proveedorId: string;
  descripcion: string;
  costo: number;
  precio: number;
  enlace: string;
  notas: string;
  tipo: string;
  referenciaStock: string;
}

export interface Presupuesto {
  presupuestoId: string;
  resguardo: string;
  version: number;
  fechaElaboracion: string | null;
  elaboradoPor: string;
  manoObra: number;
  costoPiezas: number;
  precioPiezas: number;
  total: number;
  gananciaNeta: number;
  diasEntrega: number;
  estado: string;
  fechaEnvio: string | null;
  fechaRespuesta: string | null;
  motivoRechazo: string;
  notas: string;
  tipoPieza: string;
  descripcion: string;
  numeroPresupuesto: string;
  urlPdfPresupuesto: string;
  piezas: Pieza[];
}

export interface Pedido {
  pedidoId: string;
  piezaId: string;
  resguardo: string;
  compradoPor: string;
  numeroPedido: string;
  fechaPedido: string | null;
  fechaEstimada: string | null;
  fechaRecepcion: string | null;
  estado: string;
  recibidoPor: string;
  problemaTipo: string;
  codigoDevolucion: string;
  pedidoRemplazoId: string;
  notas: string;
  enlace: string;
  proveedorId: string;
}

export interface HistorialEvento {
  eventoId: string;
  resguardo: string;
  fechaHora: string | null;
  empleadoId: string;
  tipo: string;
  descripcion: string;
  datosExtra: string;
}

export interface ReparacionDetalle {
  resguardo: string;
  fechaRecepcion: string | null;
  cliente: { nombre: string; telefono: string; email: string; direccion: string };
  equipo: { modelo: string; sintoma: string };
  estado: string;
  presupuestoAceptadoId: string;
  tecnicoAsignado: string;
  fechaReparacion: string | null;
  resultadoReparacion: string;
  numeroFactura: string;
  numeroTicket: string;
  urlTicket: string;
  estadoTicket: string;
  totalTicket: number;
  numeroTicketRevision: string;
  urlTicketRevision: string;
  fechaTicketRevision: string | null;
  totalTicketRevision: number;
  estadoTicketRevision: string;
  /** Líneas reales usadas al generar el ticket vigente de cada linaje
      (se sobrescriben en cada corregida) — permiten precargar el
      formulario de "Ticket Corregido" en vez de dejarlo en blanco
      (migración 056). */
  lineasTicket: { referencia?: string; descripcion: string; cantidad: number; precio: number; descuento?: number }[];
  lineasTicketRevision: { referencia?: string; descripcion: string; cantidad: number; precio: number; descuento?: number }[];
  ticketRectificativa: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  motivoTicketRectificativa: string;
  ticketCorregida: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  ticketRevisionRectificativa: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  motivoTicketRevisionRectificativa: string;
  ticketRevisionCorregida: { numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null } | null;
  urlFactura: string;
  fechaFactura: string | null;
  resena: string;
  fechaEntrega: string | null;
  estadoEntrega: string;
  firmaRecogidaUrl: string;
  tipoRecepcion: string;
  equipoEnLocal: string;
  entregaMensajeria: string;
  dniCif: string;
  motivoSinReparacion: string;
  tipoIngreso: string;
  revisionPagada: string;
  numeroFacturaRevision: string;
  urlFacturaRevision: string;
  clienteFacturaRevision: { nombre: string; direccion: string; dni: string; telefono: string; email: string } | null;
  ultimoUsuario: string;
  presupuestosModo: string;
  datosCintas: string;
  observaciones: string;
  creadoPor: string;
  fechaCreacion: string | null;
  totalFactura: number;
  formaPago: string;
  banco: string;
  estadoFactura: string;
  facturaBorrador: boolean;
  clienteFactura: { nombre: string; direccion: string; dni: string; telefono: string; email: string; codigo?: string } | null;
  codigoCliente: string;
  anticipoImporte: number;
  numeroFacturaAnticipo: string;
  numeroTicketAnticipo: string;
  urlTicketAnticipo: string;
  fechaTicketAnticipo: string | null;
  totalTicketAnticipo: number;
  estadoTicketAnticipo: string;
  urlFacturaAnticipo: string;
  /** Forma de pago de cada ticket — un solo slot por linaje, se
      sobrescribe en cada etapa (original → rectificativa → corregida),
      igual que lineasTicket (migración 060). */
  formaPagoTicket: string;
  bancoTicket: string;
  formaPagoTicketRevision: string;
  bancoTicketRevision: string;
  formaPagoTicketAnticipo: string;
  bancoTicketAnticipo: string;
  /** Correo del ticket — precargado con el de la reparación al generar,
      editable en ese momento y fijo después (migración 061). "Enviar al
      cliente" lo usa como destino por defecto en vez del email general
      de la reparación. */
  clienteEmailTicket: string;
  clienteEmailTicketRevision: string;
  clienteEmailTicketAnticipo: string;
  numeroFacturaMensajeria: string;
  urlFacturaMensajeria: string;
  totalFacturaMensajeria: number;
  clienteFacturaMensajeria: { nombre: string; direccion: string; dni: string; telefono: string; email: string } | null;
  numeroTicketMensajeria: string;
  urlTicketMensajeria: string;
  totalTicketMensajeria: number;
  formaPagoTicketMensajeria: string;
  bancoTicketMensajeria: string;
  clienteEmailTicketMensajeria: string;
  lineasFactura: { referencia?: string; descripcion: string; cantidad: number; precio: number; descuento?: number }[];
  rectificativa: {
    numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null;
  } | null;
  rectificativaRevision: {
    numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null;
  } | null;
  motivoRectificativa: string;
  estadoFacturaRectificativa: string;
  corregida: {
    numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null;
  } | null;
  corregidaRevision: {
    numeroFactura: string; urlFactura: string; totalFactura: number; fechaFactura: string | null;
  } | null;
  clienteFacturaCorregida: { nombre: string; direccion: string; dni: string; telefono: string; email: string } | null;
  /** Líneas reales con las que se generó la última corregida (migración
      026) — a diferencia de lineasFactura (siempre las de la factura
      original), esto permite cancelar correctamente los importes si se
      encadena otra rectificativa sobre la corregida. null en corregidas
      generadas antes de esta migración. */
  lineasFacturaCorregida: { referencia?: string; descripcion: string; cantidad: number; precio: number; descuento?: number }[] | null;
  presupuestos: Presupuesto[];
  pedidos: Pedido[];
  historialEventos: HistorialEvento[];
}

function mapearPieza(row: FilaPiezaSql): Pieza {
  const costo = numero(row.costo);
  return {
    piezaId: row.pieza_id || "",
    presupuestoId: row.presupuesto_id || "",
    proveedorId: row.proveedor_id || "",
    descripcion: row.descripcion || "",
    costo,
    precio: row.precio !== null && row.precio !== undefined && row.precio !== ("" as unknown) ? numero(row.precio) : costo,
    enlace: row.enlace || "",
    notas: row.notas || "",
    tipo: row.tipo || "",
    referenciaStock: row.referencia_stock || "",
  };
}

function mapearPresupuesto(row: FilaPresupuestoSql, piezas: FilaPiezaSql[]): Presupuesto {
  const costoPiezas = numero(row.costo_piezas);
  const manoObra = row.mano_obra !== null && row.mano_obra !== undefined && row.mano_obra !== ("" as unknown)
    ? numero(row.mano_obra)
    : numero(row.costo_reparacion);
  const precioPiezas = row.precio_piezas !== null && row.precio_piezas !== undefined && row.precio_piezas !== ("" as unknown)
    ? numero(row.precio_piezas)
    : costoPiezas;
  return {
    presupuestoId: row.presupuesto_id || "",
    resguardo: row.resguardo || "",
    version: numero(row.version) || 1,
    fechaElaboracion: fecha(row.fecha_elaboracion),
    elaboradoPor: row.elaborado_por || "",
    manoObra,
    costoPiezas,
    precioPiezas,
    total: numero(row.total),
    gananciaNeta: numero(row.ganancia_neta),
    diasEntrega: numero(row.dias_entrega),
    estado: row.estado || "borrador",
    fechaEnvio: fecha(row.fecha_envio),
    fechaRespuesta: fecha(row.fecha_respuesta),
    motivoRechazo: row.motivo_rechazo || "",
    notas: row.notas || "",
    tipoPieza: row.tipo_pieza || "no",
    descripcion: row.descripcion || "",
    numeroPresupuesto: row.numero_presupuesto || "",
    urlPdfPresupuesto: row.url_pdf_presupuesto || "",
    piezas: piezas.map(mapearPieza),
  };
}

function mapearPedido(row: FilaPedidoSql): Pedido {
  return {
    pedidoId: row.pedido_id || "",
    piezaId: row.pieza_id || "",
    resguardo: row.resguardo || "",
    compradoPor: row.comprado_por || "",
    numeroPedido: row.numero_pedido || "",
    fechaPedido: fecha(row.fecha_pedido),
    fechaEstimada: fecha(row.fecha_estimada),
    fechaRecepcion: fecha(row.fecha_recepcion),
    estado: row.estado || "",
    recibidoPor: row.recibido_por || "",
    problemaTipo: row.problema_tipo || "",
    codigoDevolucion: row.codigo_devolucion || "",
    pedidoRemplazoId: row.pedido_remplazo_id || "",
    notas: row.notas || "",
    enlace: row.enlace || "",
    proveedorId: row.proveedor_id || "",
  };
}

function mapearHistorial(row: FilaHistorialSql): HistorialEvento {
  return {
    eventoId: row.evento_id || "",
    resguardo: row.resguardo || "",
    fechaHora: fecha(row.fecha_hora),
    empleadoId: row.empleado_id || "",
    tipo: row.tipo || "",
    descripcion: row.descripcion || "",
    datosExtra: json(row.datos_extra),
  };
}

export function mapearReparacionDetalle(
  row: FilaReparacionSqlDetalle,
  presupuestosRaw: FilaPresupuestoSql[],
  piezasPorPresupuesto: Record<string, FilaPiezaSql[]>,
  pedidosRaw: FilaPedidoSql[],
  historialRaw: FilaHistorialSql[]
): ReparacionDetalle {
  return {
    resguardo: String(row.resguardo || ""),
    fechaRecepcion: fecha(row.fecha_recepcion),
    cliente: {
      nombre: row.cliente_nombre || "",
      telefono: row.cliente_telefono || "",
      email: row.cliente_email || "",
      direccion: row.direccion_envio || "",
    },
    equipo: {
      modelo: row.equipo_modelo || "",
      sintoma: row.sintoma || "",
    },
    estado: row.estado || "",
    presupuestoAceptadoId: row.presupuesto_aceptado_id || "",
    tecnicoAsignado: row.tecnico_asignado || "",
    fechaReparacion: fecha(row.fecha_reparacion),
    resultadoReparacion: row.resultado_reparacion || "",
    numeroFactura: row.numero_factura || "",
    urlFactura: row.url_factura || "",
    fechaFactura: fecha(row.fecha_factura),
    numeroTicket: row.numero_ticket || "",
    urlTicket: row.url_ticket || "",
    estadoTicket: row.estado_ticket || "",
    totalTicket: numero(row.total_ticket),
    numeroTicketRevision: row.numero_ticket_revision || "",
    urlTicketRevision: row.url_ticket_revision || "",
    fechaTicketRevision: fecha(row.fecha_ticket_revision),
    totalTicketRevision: numero(row.total_ticket_revision),
    estadoTicketRevision: row.estado_ticket_revision || "",
    lineasTicket: Array.isArray(row.lineas_ticket)
      ? (row.lineas_ticket as Array<{ referencia?: string; descripcion?: string; cantidad?: number; precio?: number; descuento?: number }>).map((l) => ({
          referencia: l.referencia || "", descripcion: l.descripcion || "", cantidad: numero(l.cantidad) || 1, precio: numero(l.precio), descuento: numero(l.descuento),
        }))
      : [],
    lineasTicketRevision: Array.isArray(row.lineas_ticket_revision)
      ? (row.lineas_ticket_revision as Array<{ referencia?: string; descripcion?: string; cantidad?: number; precio?: number; descuento?: number }>).map((l) => ({
          referencia: l.referencia || "", descripcion: l.descripcion || "", cantidad: numero(l.cantidad) || 1, precio: numero(l.precio), descuento: numero(l.descuento),
        }))
      : [],
    ticketRectificativa: row.numero_ticket_rectificativa
      ? { numeroFactura: row.numero_ticket_rectificativa, urlFactura: row.url_ticket_rectificativa || "", totalFactura: numero(row.total_ticket_rectificativa), fechaFactura: fecha(row.fecha_ticket_rectificativa) }
      : null,
    motivoTicketRectificativa: row.motivo_ticket_rectificativa || "",
    ticketCorregida: row.numero_ticket_corregida
      ? { numeroFactura: row.numero_ticket_corregida, urlFactura: row.url_ticket_corregida || "", totalFactura: numero(row.total_ticket_corregida), fechaFactura: fecha(row.fecha_ticket_corregida) }
      : null,
    ticketRevisionRectificativa: row.numero_ticket_revision_rectificativa
      ? { numeroFactura: row.numero_ticket_revision_rectificativa, urlFactura: row.url_ticket_revision_rectificativa || "", totalFactura: numero(row.total_ticket_revision_rectificativa), fechaFactura: fecha(row.fecha_ticket_revision_rectificativa) }
      : null,
    motivoTicketRevisionRectificativa: row.motivo_ticket_revision_rectificativa || "",
    ticketRevisionCorregida: row.numero_ticket_revision_corregida
      ? { numeroFactura: row.numero_ticket_revision_corregida, urlFactura: row.url_ticket_revision_corregida || "", totalFactura: numero(row.total_ticket_revision_corregida), fechaFactura: fecha(row.fecha_ticket_revision_corregida) }
      : null,
    resena: row.resena || "NO",
    fechaEntrega: fecha(row.fecha_entrega),
    estadoEntrega: row.estado_entrega || "PENDIENTE",
    firmaRecogidaUrl: row.firma_recogida_url || "",
    tipoRecepcion: row.tipo_recepcion || "LOCAL",
    equipoEnLocal: row.equipo_en_local || "SI",
    entregaMensajeria: row.entrega_mensajeria || "NO",
    dniCif: row.dni_cif || "",
    motivoSinReparacion: row.motivo_sin_reparacion || "",
    tipoIngreso: row.tipo_ingreso || "NORMAL",
    revisionPagada: row.revision_pagada ? "SI" : "NO",
    numeroFacturaRevision: row.numero_factura_revision || "",
    urlFacturaRevision: row.url_factura_revision || "",
    clienteFacturaRevision: clienteFacturaObj(row.cliente_factura_revision),
    ultimoUsuario: row.ultimo_usuario || "",
    presupuestosModo: row.presupuestos_modo || "",
    datosCintas: json(row.datos_cintas),
    observaciones: row.observaciones || "",
    creadoPor: row.creado_por || "",
    fechaCreacion: fecha(row.fecha_creacion),
    totalFactura: numero(row.total_factura),
    formaPago: row.forma_pago || "",
    banco: row.banco || "",
    estadoFactura: row.estado_factura || "",
    facturaBorrador: !!row.factura_borrador,
    clienteFactura: clienteFacturaObj(row.cliente_factura),
    codigoCliente: row.codigo_cliente || "",
    anticipoImporte: numero(row.anticipo_importe),
    numeroFacturaAnticipo: row.numero_factura_anticipo || "",
    urlFacturaAnticipo: row.url_factura_anticipo || "",
    numeroTicketAnticipo: row.numero_ticket_anticipo || "",
    urlTicketAnticipo: row.url_ticket_anticipo || "",
    fechaTicketAnticipo: fecha(row.fecha_ticket_anticipo),
    totalTicketAnticipo: numero(row.total_ticket_anticipo),
    estadoTicketAnticipo: row.estado_ticket_anticipo || "",
    formaPagoTicket: row.forma_pago_ticket || "",
    bancoTicket: row.banco_ticket || "",
    formaPagoTicketRevision: row.forma_pago_ticket_revision || "",
    bancoTicketRevision: row.banco_ticket_revision || "",
    formaPagoTicketAnticipo: row.forma_pago_ticket_anticipo || "",
    bancoTicketAnticipo: row.banco_ticket_anticipo || "",
    clienteEmailTicket: row.cliente_email_ticket || "",
    clienteEmailTicketRevision: row.cliente_email_ticket_revision || "",
    clienteEmailTicketAnticipo: row.cliente_email_ticket_anticipo || "",
    numeroFacturaMensajeria: row.numero_factura_mensajeria || "",
    urlFacturaMensajeria: row.url_factura_mensajeria || "",
    totalFacturaMensajeria: numero(row.total_factura_mensajeria),
    clienteFacturaMensajeria: clienteFacturaObj(row.cliente_factura_mensajeria),
    numeroTicketMensajeria: row.numero_ticket_mensajeria || "",
    urlTicketMensajeria: row.url_ticket_mensajeria || "",
    totalTicketMensajeria: numero(row.total_ticket_mensajeria),
    formaPagoTicketMensajeria: row.forma_pago_ticket_mensajeria || "",
    bancoTicketMensajeria: row.banco_ticket_mensajeria || "",
    clienteEmailTicketMensajeria: row.cliente_email_ticket_mensajeria || "",
    lineasFactura: Array.isArray(row.lineas_factura)
      ? (row.lineas_factura as Array<{ referencia?: string; descripcion?: string; cantidad?: number; precio?: number; descuento?: number }>).map((l) => ({
          referencia: l.referencia || "", descripcion: l.descripcion || "", cantidad: numero(l.cantidad) || 1, precio: numero(l.precio), descuento: numero(l.descuento),
        }))
      : [],
    rectificativa: row.numero_factura_rectificativa
      ? { numeroFactura: row.numero_factura_rectificativa, urlFactura: row.url_factura_rectificativa || "", totalFactura: numero(row.total_factura_rectificativa), fechaFactura: fecha(row.fecha_factura_rectificativa) }
      : null,
    rectificativaRevision: row.numero_factura_rectificativa_revision
      ? { numeroFactura: row.numero_factura_rectificativa_revision, urlFactura: row.url_factura_rectificativa_revision || "", totalFactura: numero(row.total_factura_rectificativa_revision), fechaFactura: fecha(row.fecha_factura_rectificativa_revision) }
      : null,
    motivoRectificativa: row.motivo_rectificativa || "",
    estadoFacturaRectificativa: row.estado_factura_rectificativa || "",
    corregida: row.numero_factura_corregida
      ? { numeroFactura: row.numero_factura_corregida, urlFactura: row.url_factura_corregida || "", totalFactura: numero(row.total_factura_corregida), fechaFactura: fecha(row.fecha_factura_corregida) }
      : null,
    corregidaRevision: row.numero_factura_corregida_revision
      ? { numeroFactura: row.numero_factura_corregida_revision, urlFactura: row.url_factura_corregida_revision || "", totalFactura: numero(row.total_factura_corregida_revision), fechaFactura: fecha(row.fecha_factura_corregida_revision) }
      : null,
    clienteFacturaCorregida: clienteFacturaObj(row.cliente_factura_corregida),
    lineasFacturaCorregida: Array.isArray(row.lineas_factura_corregida)
      ? (row.lineas_factura_corregida as Array<{ referencia?: string; descripcion?: string; cantidad?: number; precio?: number; descuento?: number }>).map((l) => ({
          referencia: l.referencia || "", descripcion: l.descripcion || "", cantidad: numero(l.cantidad) || 1, precio: numero(l.precio), descuento: numero(l.descuento),
        }))
      : null,
    presupuestos: presupuestosRaw.map((p) => mapearPresupuesto(p, piezasPorPresupuesto[p.presupuesto_id] || [])),
    pedidos: pedidosRaw.map(mapearPedido),
    historialEventos: historialRaw.map(mapearHistorial),
  };
}
