/**
 * Réplica de kelatosApiObtenerMetricasDashboardSql (Apps Script,
 * DatabaseApi.js): el endpoint /v1/lecturas/metricas-dashboard devuelve
 * counts + listas de "candidatos" sin filtrar — el umbral (24h para
 * presupuestos, 5/7 días para alertas, días laborables para equipos) se
 * aplica en el cliente, no en el servidor SQL. Se porta aquí tal cual.
 */

export interface AlertaDashboard {
  tipo: "presupuesto" | "recogida";
  mensaje: string;
  resguardo: string;
}

export interface PresupuestoRetrasado {
  resguardo: string;
  cliente: string;
  equipo: string;
  horasRetraso: number;
  diasRetraso: number;
}

export interface EquipoRetrasado {
  resguardo: string;
  cliente: string;
  equipo: string;
  estado: string;
  diasExcedidos: number;
  diasPrometidos: number;
}

/** Reproduce los 13 valores de tipoCard en filtrarPorCard() del original (Index.html). */
export type CardFiltroId =
  | "pptoPendiente"
  | "piezaPendiente"
  | "enReparacion"
  | "listos"
  | "pptoEnviado"
  | "pptoAceptado"
  | "piezaEntregada"
  | "garantia"
  | "mensajeriaActiva"
  | "formularioPendiente"
  | "cintasEnReparacion"
  | "pptoRetrasado"
  | "entregaRetrasada";

/** Mismo mapeo que cardEstados en aplicarFiltrosCombinados() del original — null = sin filtro de estado (solo el predicado extra). */
export const CARD_FILTRO_ESTADOS: Record<CardFiltroId, string[] | null> = {
  formularioPendiente: ["Formulario Pendiente"],
  pptoPendiente: ["Presupuesto Pendiente"],
  pptoAceptado: ["Presupuesto Aceptado"],
  piezaPendiente: ["Pieza Pendiente"],
  enReparacion: ["En Reparación"],
  // Deliberadamente sin filtro de estado (mismo motivo que garantia más
  // abajo): una conversión de cintas puede estar en Garantía, Presupuesto
  // Enviado, etc., no solo "En Reparación" — filtrar por estado aquí hacía
  // que la card mostrara casos en "En Reparación" pero ocultara el resto
  // en cuanto avanzaban (o si nunca pasaron por ese estado, p.ej. una
  // conversión que entra directamente como garantía). Se filtra por
  // datosCintas más abajo (page.tsx), no por estado.
  cintasEnReparacion: null,
  mensajeriaActiva: null,
  listos: ["Reparado", "No tiene Reparación", "Presupuesto Rechazado"],
  pptoEnviado: ["Presupuesto Enviado"],
  piezaEntregada: ["Pieza Entregada"],
  // Deliberadamente sin filtro de estado (a diferencia del resto de
  // cards): un caso de garantía que requiere pieza pasa a "Pieza
  // Pendiente" y dejaba de contar/aparecer como Garantía en cuanto salía
  // de ese estado — el dashboard perdía el rastro justo en el caso más
  // habitual (pieza pendiente de garantía). Se filtra por tipoIngreso más
  // abajo (page.tsx), no por estado, así una misma reparación puede
  // aparecer con dos etiquetas a la vez (p.ej. "Pieza Pendiente" y
  // "Garantía") en vez de tener que elegir solo una.
  garantia: null,
  pptoRetrasado: ["Presupuesto Pendiente"],
  entregaRetrasada: ["En Reparación", "Pieza Pendiente", "En Tránsito", "Pieza Entregada"],
};

export interface MetricasDashboard {
  formularioPendiente: number;
  presupuestoPendiente: number;
  pptoEnviado: number;
  esperandoPieza: number;
  piezaEntregada: number;
  enReparacion: number;
  pptosAceptados: number;
  cintasEnReparacion: number;
  mensajeriaActiva: number;
  listos: number;
  garantia: number;
  totalReparaciones: number;
  totalFinalizadas: number;
  alertas: AlertaDashboard[];
  presupuestosRetrasados: PresupuestoRetrasado[];
  equiposRetrasados: EquipoRetrasado[];
}

interface RespuestaMetricasSql {
  ok: boolean;
  counts: Record<string, string | number>;
  presupuestosRetrasadosCandidatos: { resguardo: string; cliente: string; equipo: string; fecha_recepcion: string }[];
  alertasCandidatos: { tipo: "presupuesto" | "recogida"; resguardo: string; fecha_referencia: string }[];
  equiposRetrasadosCandidatos: {
    resguardo: string;
    cliente: string;
    equipo: string;
    estado: string;
    fecha_respuesta: string;
    dias_entrega: string | number;
  }[];
}

function horasTranscurridas(inicio: string, fin: Date): number {
  return Math.floor((fin.getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60));
}

function diasLaborables(inicio: Date, fin: Date): number {
  const i = new Date(inicio);
  const f = new Date(fin);
  i.setHours(0, 0, 0, 0);
  f.setHours(0, 0, 0, 0);
  let dias = 0;
  const actual = new Date(i);
  while (actual <= f) {
    const diaSemana = actual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
    actual.setDate(actual.getDate() + 1);
  }
  return dias;
}

export function mapearMetricas(resp: RespuestaMetricasSql): MetricasDashboard {
  const c = resp.counts;
  const ahora = new Date();

  const presupuestosRetrasados: PresupuestoRetrasado[] = [];
  for (const r of resp.presupuestosRetrasadosCandidatos) {
    const horas = horasTranscurridas(r.fecha_recepcion, ahora);
    if (horas >= 24) {
      presupuestosRetrasados.push({
        resguardo: r.resguardo,
        cliente: r.cliente || "",
        equipo: r.equipo || "",
        horasRetraso: Math.round(horas),
        diasRetraso: Math.floor(horas / 24),
      });
    }
  }

  const alertas: AlertaDashboard[] = [];
  for (const a of resp.alertasCandidatos) {
    const diasDesde = Math.floor((ahora.getTime() - new Date(a.fecha_referencia).getTime()) / (1000 * 60 * 60 * 24));
    if (a.tipo === "presupuesto" && diasDesde >= 5) {
      alertas.push({ tipo: "presupuesto", mensaje: `Presupuesto sin respuesta hace ${diasDesde} días`, resguardo: a.resguardo });
    } else if (a.tipo === "recogida" && diasDesde >= 7) {
      alertas.push({ tipo: "recogida", mensaje: `Equipo listo sin recoger hace ${diasDesde} días`, resguardo: a.resguardo });
    }
  }

  const equiposRetrasados: EquipoRetrasado[] = [];
  for (const r of resp.equiposRetrasadosCandidatos) {
    const transcurridos = diasLaborables(new Date(r.fecha_respuesta), ahora);
    const restantes = Number(r.dias_entrega) - transcurridos;
    if (restantes < 0) {
      equiposRetrasados.push({
        resguardo: r.resguardo,
        cliente: r.cliente || "",
        equipo: r.equipo || "",
        estado: r.estado || "",
        diasExcedidos: Math.abs(restantes),
        diasPrometidos: Number(r.dias_entrega),
      });
    }
  }

  return {
    formularioPendiente: Number(c.formulario_pendiente) || 0,
    presupuestoPendiente: Number(c.presupuesto_pendiente) || 0,
    pptoEnviado: Number(c.ppto_enviado) || 0,
    esperandoPieza: Number(c.esperando_pieza) || 0,
    piezaEntregada: Number(c.pieza_entregada) || 0,
    enReparacion: Number(c.en_reparacion) || 0,
    pptosAceptados: Number(c.pptos_aceptados) || 0,
    cintasEnReparacion: Number(c.cintas_en_reparacion) || 0,
    mensajeriaActiva: Number(c.mensajeria_activa) || 0,
    listos: Number(c.listos) || 0,
    garantia: Number(c.garantia) || 0,
    totalReparaciones: Number(c.total_reparaciones) || 0,
    totalFinalizadas: Number(c.total_finalizadas) || 0,
    alertas,
    presupuestosRetrasados,
    equiposRetrasados,
  };
}

export type { RespuestaMetricasSql };
