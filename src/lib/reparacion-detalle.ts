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
  ultimo_usuario: string | null;
  presupuestos_modo: string | null;
  datos_cintas: unknown;
  observaciones: string | null;
  creado_por: string | null;
  fecha_creacion: string | null;
  total_factura: string | number | null;
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
  urlFactura: string;
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
  ultimoUsuario: string;
  presupuestosModo: string;
  datosCintas: string;
  observaciones: string;
  creadoPor: string;
  fechaCreacion: string | null;
  totalFactura: number;
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
    ultimoUsuario: row.ultimo_usuario || "",
    presupuestosModo: row.presupuestos_modo || "",
    datosCintas: json(row.datos_cintas),
    observaciones: row.observaciones || "",
    creadoPor: row.creado_por || "",
    fechaCreacion: fecha(row.fecha_creacion),
    totalFactura: numero(row.total_factura),
    presupuestos: presupuestosRaw.map((p) => mapearPresupuesto(p, piezasPorPresupuesto[p.presupuesto_id] || [])),
    pedidos: pedidosRaw.map(mapearPedido),
    historialEventos: historialRaw.map(mapearHistorial),
  };
}
