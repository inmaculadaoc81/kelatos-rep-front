/**
 * Tipos y mapeo de filas de kelatos_app.reparaciones — replica en
 * TypeScript el contrato de _mapearFilaReparacionSql (Apps Script,
 * DatabaseApi.js) para que la forma de los datos sea idéntica a la que
 * ya consume el Dashboard original (Index.html).
 */

export interface ReparacionCliente {
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface ReparacionEquipo {
  modelo: string;
  sintoma: string;
}

export interface DatosCintasTipos {
  vhs: number;
  vhsc: number;
  beta: number;
  minidv: number;
  "8mm": number;
  cassette: number;
  bobina: number;
}

export interface DatosCintas {
  tipos: DatosCintasTipos;
  total: number;
  precioUnitario: number;
}

export interface PresupuestoResumen {
  presupuestoId: string;
  version: number;
  estado: string;
  diasEntrega: number;
  costoPiezas: number;
  fechaRespuesta: string | null;
}

export interface PedidoResumen {
  pedidoId: string;
  estado: string;
  fechaRecepcion: string | null;
}

export interface Reparacion {
  resguardo: string;
  fechaRecepcion: string | null;
  cliente: ReparacionCliente;
  /** Solo se rellena en Reporte Equipos (lookup por DNI/teléfono contra el
      directorio de clientes) — el resto de vistas no lo necesitan. */
  codigoCliente?: string;
  dniCif: string;
  equipo: ReparacionEquipo;
  datosCintas: DatosCintas | null;
  estado: string;
  presupuestoAceptadoId: string;
  presupuestosAceptadosIds: string[];
  tecnicoAsignado: string;
  fechaEntrega: string | null;
  estadoEntrega: string;
  tipoRecepcion: string;
  equipoEnLocal: string;
  entregaMensajeria: string;
  observaciones: string;
  numeroFactura: string;
  resena: string;
  pptoDescripcion: string;
  presupuestos: PresupuestoResumen[];
  pedidos: PedidoResumen[];
  pptoAceptadoSummary: {
    diasEntrega: number;
    fechaRespuesta: string | null;
    costoPiezas: number;
    descripcion: string;
    total: number;
  } | null;
}

// Fila cruda tal como la devuelve GET /v1/lecturas/reparaciones (snake_case).
interface FilaReparacionSql {
  resguardo: string;
  fecha_recepcion: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  dni_cif: string | null;
  direccion_envio: string | null;
  equipo_modelo: string | null;
  sintoma: string | null;
  datos_cintas: DatosCintas | null;
  estado: string | null;
  presupuesto_aceptado_id: string | null;
  tecnico_asignado: string | null;
  fecha_entrega: string | null;
  estado_entrega: string | null;
  tipo_recepcion: string | null;
  equipo_en_local: string | null;
  entrega_mensajeria: string | null;
  observaciones: string | null;
  numero_factura: string | null;
  resena: string | null;
}

interface PptoAceptado {
  dias_entrega: string | number;
  fecha_respuesta: string | null;
  costo_piezas: string | number;
  descripcion: string | null;
  total: string | number;
}

interface PedidoRaw {
  pedido_id: string;
  estado: string;
  fecha_recepcion: string | null;
}

export interface RespuestaLecturasReparaciones {
  ok: boolean;
  resultados: FilaReparacionSql[];
  total: number;
  pagina: number;
  totalPaginas: number;
  porPagina: number;
  pedidosPorResguardo: Record<string, PedidoRaw[]>;
  pptoAceptadoPorResguardo: Record<string, PptoAceptado>;
}

export function mapearFilaReparacion(
  row: FilaReparacionSql,
  pedidosPorResguardo: Record<string, PedidoRaw[]>,
  pptoAceptadoPorResguardo: Record<string, PptoAceptado>
): Reparacion {
  const ppto = pptoAceptadoPorResguardo[row.resguardo] || null;

  return {
    resguardo: String(row.resguardo || ""),
    fechaRecepcion: row.fecha_recepcion || null,
    cliente: {
      nombre: row.cliente_nombre || "",
      telefono: row.cliente_telefono || "",
      email: row.cliente_email || "",
      direccion: row.direccion_envio || "",
    },
    dniCif: row.dni_cif || "",
    equipo: {
      modelo: row.equipo_modelo || "",
      sintoma: row.sintoma || "",
    },
    datosCintas: row.datos_cintas && row.datos_cintas.tipos ? row.datos_cintas : null,
    estado: row.estado || "",
    presupuestoAceptadoId: row.presupuesto_aceptado_id || "",
    presupuestosAceptadosIds: String(row.presupuesto_aceptado_id || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    tecnicoAsignado: row.tecnico_asignado || "",
    fechaEntrega: row.fecha_entrega || null,
    estadoEntrega: row.estado_entrega || "PENDIENTE",
    tipoRecepcion: row.tipo_recepcion || "LOCAL",
    equipoEnLocal: row.equipo_en_local || "SI",
    entregaMensajeria: row.entrega_mensajeria || "NO",
    observaciones: row.observaciones || "",
    numeroFactura: row.numero_factura || "",
    resena: row.resena || "",
    pptoDescripcion: ppto?.descripcion || "",
    // presupuestos (histórico completo) no viene en este endpoint — solo el
    // resumen del presupuesto aceptado (pptoAceptadoSummary), igual que
    // kelatosApiBuscarReparacionesSql en Apps Script.
    presupuestos: [],
    pedidos: (pedidosPorResguardo[row.resguardo] || []).map((p) => ({
      pedidoId: p.pedido_id,
      estado: p.estado,
      fechaRecepcion: p.fecha_recepcion || null,
    })),
    pptoAceptadoSummary: ppto
      ? {
          diasEntrega: Number(ppto.dias_entrega) || 0,
          fechaRespuesta: ppto.fecha_respuesta || null,
          costoPiezas: Number(ppto.costo_piezas) || 0,
          descripcion: String(ppto.descripcion || ""),
          total: Number(ppto.total) || 0,
        }
      : null,
  };
}

// Colores por estado — idénticos a obtenerBadgeEstado() en Index.html.
export const COLOR_ESTADO: Record<string, { bg: string; fg: string }> = {
  "Formulario Pendiente": { bg: "#fd7e14", fg: "#fff" },
  "Presupuesto Pendiente": { bg: "#ff9999", fg: "#333" },
  "Presupuesto Enviado": { bg: "#99ccff", fg: "#333" },
  "Presupuesto Rechazado": { bg: "#99cc99", fg: "#333" },
  "Pieza Entregada": { bg: "#99ccff", fg: "#333" },
  "En Reparación": { bg: "#ffcc66", fg: "#333" },
  Reparado: { bg: "#006400", fg: "#fff" },
  Garantía: { bg: "#333333", fg: "#fff" },
  "No tiene Reparación": { bg: "#ccffcc", fg: "#333" },
  "Presupuesto Aceptado": { bg: "#20c997", fg: "#333" },
};
