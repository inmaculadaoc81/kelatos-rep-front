/**
 * Reportes de reparaciones cerradas + ventas de piezas — port fiel de
 * backend/Reportes.js (obtenerReportesReparaciones / obtenerAlertasReportes)
 * y de la agregación cliente de aplicarFiltrosReportes() en Index.html.
 *
 * Las fechas se normalizan a 'yyyy-MM-dd' en Europe/Madrid, igual que el
 * original (Utilities.formatDate(..., 'Europe/Madrid', 'yyyy-MM-dd')).
 */

// Copia de KELATOS.PRECIO_REVISION (backend/Config.js) — ganancia imputada
// a una reparación entregada sin presupuesto aceptado pero con revisión
// cobrada, exactamente como hace Reportes.js.
export const PRECIO_REVISION = 20;

export interface EntradaReporte {
  fecha: string;
  tipo: "reparacion" | "venta";
  ganancia: number;
  modelo?: string;
  sintoma?: string;
  tecnico?: string;
  dias?: number | null;
}

export interface DatosReportes {
  entradas: EntradaReporte[];
  sinReparacion: { fecha: string }[];
  recepciones: { fecha: string; tipoIngreso: string }[];
}

export interface ReparacionAbierta {
  resguardo: string;
  cliente: string;
  modelo: string;
  estado: string;
  fechaRecepcion: string;
  diasAbierta: number;
}

export interface PresupuestoPendiente {
  resguardo: string;
  cliente: string;
  modelo: string;
  estadoRep: string;
  total: number;
  estadoPres: string;
  fechaEnvio: string;
  diasPendiente: number | null;
}

export interface AlertasReportes {
  reparacionesAbiertas: ReparacionAbierta[];
  presupuestosPendientes: PresupuestoPendiente[];
}

/** Fecha → 'yyyy-MM-dd' en Europe/Madrid; null si no es válida. */
export function fechaMadrid(valor: unknown): string | null {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(d.getTime())) return null;
  // en-CA produce directamente yyyy-mm-dd
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function aFecha(valor: unknown): Date | null {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(String(valor));
  return Number.isNaN(d.getTime()) ? null : d;
}

function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Filas crudas tal como llegan del API (snake_case) ──────────────────

export interface FilaReparacionReporte {
  resguardo: string;
  fecha_recepcion: string | null;
  fecha_entrega: string | null;
  estado_entrega: string | null;
  estado: string | null;
  motivo_sin_reparacion: string | null;
  revision_pagada: boolean | string | null;
  equipo_modelo: string | null;
  sintoma: string | null;
  tecnico_asignado: string | null;
  cliente_nombre: string | null;
  tipo_recepcion: string | null;
}

export interface FilaPresupuestoReporte {
  resguardo: string;
  estado: string | null;
  ganancia_neta: string | number | null;
  total: string | number | null;
  fecha_envio: string | null;
  fecha_elaboracion: string | null;
}

export interface FilaVentaReporte {
  venta_id: string;
  estado: string | null;
  fecha_entrega: string | null;
}

export interface FilaItemVentaReporte {
  venta_id: string;
  precio: string | number | null;
  costo: string | number | null;
}

/**
 * Reproduce obtenerReportesReparaciones(). Solo contabiliza como "cerrada"
 * una reparación con estado_entrega ENTREGADO; el resto, si tiene motivo o
 * el estado sugiere "sin reparación", cuenta para la tasa de cierre.
 */
export function construirDatosReportes(
  reparaciones: FilaReparacionReporte[],
  presupuestos: FilaPresupuestoReporte[],
  ventas: FilaVentaReporte[],
  itemsPorVenta: Record<string, FilaItemVentaReporte[]>
): DatosReportes {
  const entradas: EntradaReporte[] = [];
  const sinReparacion: { fecha: string }[] = [];
  const recepciones: { fecha: string; tipoIngreso: string }[] = [];

  // Mapa resguardo → mayor ganancia_neta entre sus presupuestos aceptados.
  const gananciaPorResguardo: Record<string, number> = {};
  for (const p of presupuestos) {
    if (String(p.estado || "").toLowerCase() !== "aceptado") continue;
    const res = String(p.resguardo || "");
    const gan = Number(p.ganancia_neta) || 0;
    if (gananciaPorResguardo[res] === undefined || gan > gananciaPorResguardo[res]) {
      gananciaPorResguardo[res] = gan;
    }
  }

  for (const r of reparaciones) {
    // Recepción: se registra pase lo que pase con el estado.
    const fechaRecep = fechaMadrid(r.fecha_recepcion);
    if (fechaRecep) {
      recepciones.push({ fecha: fechaRecep, tipoIngreso: String(r.tipo_recepcion || "LOCAL").trim() });
    }

    if (!r.fecha_entrega) continue;
    const fechaEntregaDate = aFecha(r.fecha_entrega);
    if (!fechaEntregaDate) continue;
    const fechaStr = fechaMadrid(r.fecha_entrega)!;

    const estadoEnt = String(r.estado_entrega || "").toUpperCase().trim();

    if (estadoEnt !== "ENTREGADO") {
      const motivo = String(r.motivo_sin_reparacion || "").trim();
      const esSinRep =
        motivo !== "" ||
        estadoEnt.includes("SIN") ||
        estadoEnt.includes("NO ") ||
        estadoEnt.includes("NO_") ||
        estadoEnt.includes("REPARAC");
      if (esSinRep) sinReparacion.push({ fecha: fechaStr });
      continue;
    }

    const fechaRecepDate = aFecha(r.fecha_recepcion);
    const dias = fechaRecepDate
      ? Math.round((fechaEntregaDate.getTime() - fechaRecepDate.getTime()) / 86400000)
      : null;

    const rev = r.revision_pagada;
    const revCobrada =
      rev === true ||
      String(rev).toLowerCase() === "true" ||
      String(rev) === "1" ||
      String(rev).toUpperCase() === "SI" ||
      String(rev).toUpperCase() === "SÍ";

    const resguardo = String(r.resguardo || "");
    const ganancia =
      gananciaPorResguardo[resguardo] !== undefined
        ? gananciaPorResguardo[resguardo]
        : revCobrada
          ? PRECIO_REVISION
          : 0;

    entradas.push({
      fecha: fechaStr,
      tipo: "reparacion",
      ganancia: redondear2(ganancia),
      modelo: String(r.equipo_modelo || "").trim(),
      sintoma: String(r.sintoma || "").trim(),
      tecnico: String(r.tecnico_asignado || "").trim(),
      dias,
    });
  }

  // ── Ventas de piezas ────────────────────────────────────────────────
  const gananciaPorVenta: Record<string, number> = {};
  for (const [ventaId, items] of Object.entries(itemsPorVenta)) {
    gananciaPorVenta[ventaId] = items.reduce(
      (s, it) => s + ((Number(it.precio) || 0) - (Number(it.costo) || 0)),
      0
    );
  }

  for (const v of ventas) {
    if (String(v.estado || "").toLowerCase().trim() !== "entregado") continue;
    const fecha = fechaMadrid(v.fecha_entrega);
    if (!fecha) continue;
    entradas.push({
      fecha,
      tipo: "venta",
      ganancia: redondear2(gananciaPorVenta[String(v.venta_id || "")] || 0),
    });
  }

  entradas.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));

  return { entradas, sinReparacion, recepciones };
}

/** Reproduce obtenerAlertasReportes(umbralDias). */
export function construirAlertas(
  reparaciones: FilaReparacionReporte[],
  presupuestos: FilaPresupuestoReporte[],
  umbralDias: number
): AlertasReportes {
  const ahora = Date.now();
  const infoRep: Record<string, { cliente: string; modelo: string; estado: string }> = {};
  const reparacionesAbiertas: ReparacionAbierta[] = [];

  for (const r of reparaciones) {
    const resguardo = String(r.resguardo || "").trim();
    if (!resguardo) continue;

    const cliente = String(r.cliente_nombre || "").trim();
    const modelo = String(r.equipo_modelo || "").trim();
    const estado = String(r.estado || "").trim();
    infoRep[resguardo] = { cliente, modelo, estado };

    const fechaRec = aFecha(r.fecha_recepcion);
    if (!r.fecha_entrega && fechaRec) {
      const dias = Math.floor((ahora - fechaRec.getTime()) / 86400000);
      if (dias >= umbralDias) {
        reparacionesAbiertas.push({
          resguardo,
          cliente,
          modelo,
          estado,
          fechaRecepcion: fechaMadrid(r.fecha_recepcion) || "",
          diasAbierta: dias,
        });
      }
    }
  }
  reparacionesAbiertas.sort((a, b) => b.diasAbierta - a.diasAbierta);

  // Presupuestos sin respuesta — uno por resguardo (el primero que aparece,
  // igual que el original, que evita duplicados entre versiones).
  const presupuestosPendientes: PresupuestoPendiente[] = [];
  const vistos: Record<string, boolean> = {};

  for (const p of presupuestos) {
    const estado = String(p.estado || "").toLowerCase().trim();
    if (estado === "aceptado" || estado === "rechazado") continue;

    const res = String(p.resguardo || "").trim();
    if (!res || vistos[res]) continue;
    vistos[res] = true;

    const fechaEnvio = aFecha(p.fecha_envio);
    const fechaRef = fechaEnvio || aFecha(p.fecha_elaboracion);
    const diasPend = fechaRef ? Math.floor((ahora - fechaRef.getTime()) / 86400000) : null;

    const info = infoRep[res] || { cliente: "", modelo: "", estado: "" };
    presupuestosPendientes.push({
      resguardo: res,
      cliente: info.cliente,
      modelo: info.modelo,
      estadoRep: info.estado,
      total: Number(p.total) || 0,
      estadoPres: String(p.estado || "pendiente"),
      fechaEnvio: fechaEnvio ? fechaMadrid(p.fecha_envio)! : "",
      diasPendiente: diasPend,
    });
  }
  presupuestosPendientes.sort((a, b) => (b.diasPendiente || 0) - (a.diasPendiente || 0));

  return { reparacionesAbiertas, presupuestosPendientes };
}

// ── Agregación de cliente (port de aplicarFiltrosReportes) ─────────────

export interface FiltrosReportes {
  tipo: "" | "reparacion" | "venta";
  anio: string;
  mes: string;
}

export interface PuntoDia {
  fecha: string;
  count: number;
  ganancia: number;
  rep: number;
  ven: number;
}

export interface PuntoMes {
  mes: string;
  count: number;
  ganancia: number;
  rep: number;
  ven: number;
}

export interface ItemRanking {
  nombre: string;
  count: number;
  ganancia: number;
}

export interface ResultadoReportes {
  cerradasPeriodo: number;
  totalEntradas: number;
  gananciaPeriodo: number;
  ticketMedio: number;
  deltaCerradas: number | null;
  deltaGanancia: number | null;
  deltaTicket: number | null;
  mesAnteriorLabel: string;
  periodoLabel: string;
  tasaCierre: number | null;
  totalReparadas: number;
  totalSinReparacion: number;
  tiempoMedio: number | null;
  muestraTiempo: number;
  porDia: PuntoDia[];
  porMes: PuntoMes[];
  topModelos: ItemRanking[];
  topSintomas: ItemRanking[];
  topTecnicos: ItemRanking[];
  recepcionesPorDia: { fecha: string; count: number }[];
  totalRecepciones: number;
}

const MESES_NOMBRE = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MESES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Clave 'yyyy-MM' del mes actual en Europe/Madrid. */
export function mesActualKey(): string {
  return fechaMadrid(new Date())!.slice(0, 7);
}

export function calcularReportes(datos: DatosReportes, filtros: FiltrosReportes): ResultadoReportes {
  const { tipo, anio, mes } = filtros;
  const mesActual = mesActualKey();

  let entradas = datos.entradas;
  if (tipo) entradas = entradas.filter((e) => e.tipo === tipo);
  if (anio) entradas = entradas.filter((e) => e.fecha.startsWith(anio));
  if (mes) entradas = entradas.filter((e) => e.fecha.slice(5, 7) === mes);
  const entradasRep = entradas.filter((e) => e.tipo === "reparacion");

  // Agregación por día y por mes
  const mapaDia: Record<string, PuntoDia> = {};
  const mapaMes: Record<string, PuntoMes> = {};
  for (const e of entradas) {
    if (!mapaDia[e.fecha]) mapaDia[e.fecha] = { fecha: e.fecha, count: 0, ganancia: 0, rep: 0, ven: 0 };
    const d = mapaDia[e.fecha];
    d.count++;
    d.ganancia += e.ganancia;
    if (e.tipo === "reparacion") d.rep++;
    else d.ven++;

    const mk = e.fecha.slice(0, 7);
    if (!mapaMes[mk]) mapaMes[mk] = { mes: mk, count: 0, ganancia: 0, rep: 0, ven: 0 };
    const m = mapaMes[mk];
    m.count++;
    m.ganancia += e.ganancia;
    if (e.tipo === "reparacion") m.rep++;
    else m.ven++;
  }
  const porDia = Object.keys(mapaDia).sort().map((k) => mapaDia[k]);
  const porMes = Object.keys(mapaMes).sort().map((k) => mapaMes[k]);

  const totalEntradas = entradas.length;
  const gananciaTotal = entradas.reduce((s, e) => s + e.ganancia, 0);
  const ticketMedio = totalEntradas > 0 ? gananciaTotal / totalEntradas : 0;

  // KPI del periodo — se adapta al filtro activo, igual que el original.
  const baseKpi = tipo ? datos.entradas.filter((e) => e.tipo === tipo) : datos.entradas;
  const enPeriodo = (e: EntradaReporte) => {
    if (mes && anio) return e.fecha.startsWith(`${anio}-${mes}`);
    if (mes) return e.fecha.slice(5, 7) === mes;
    if (anio) return e.fecha.startsWith(`${anio}-${mesActual.slice(5)}`);
    return e.fecha.startsWith(mesActual);
  };
  const entradasKpi = baseKpi.filter(enPeriodo);
  const cerradasPeriodo = entradasKpi.length;
  const gananciaPeriodo = entradasKpi.reduce((s, e) => s + e.ganancia, 0);

  // Periodo anterior para las comparativas
  const mesN = mes ? parseInt(mes, 10) : parseInt(mesActual.slice(5), 10);
  const anioN = mes && anio ? parseInt(anio, 10) : parseInt(mesActual.slice(0, 4), 10);
  const pMes = mesN === 1 ? 12 : mesN - 1;
  const pAnio = mesN === 1 ? anioN - 1 : anioN;
  const pPad = String(pMes).padStart(2, "0");
  const enPeriodoAnterior = (e: EntradaReporte) => {
    if (mes && anio) return e.fecha.startsWith(`${pAnio}-${pPad}`);
    if (mes) return e.fecha.slice(5, 7) === pPad;
    return e.fecha.startsWith(`${pAnio}-${pPad}`);
  };
  const entradasAnt = baseKpi.filter(enPeriodoAnterior);
  const antCount = entradasAnt.length;
  const antGan = entradasAnt.reduce((s, e) => s + e.ganancia, 0);
  const antTicket = antCount > 0 ? antGan / antCount : 0;

  const delta = (actual: number, anterior: number): number | null =>
    anterior ? Math.round(((actual - anterior) / anterior) * 100) : null;

  // Tasa de cierre
  const sinRepFiltradas = datos.sinReparacion.filter((e) => {
    if (mes && anio) return e.fecha.startsWith(`${anio}-${mes}`);
    if (mes) return e.fecha.slice(5, 7) === mes;
    if (anio) return e.fecha.startsWith(anio);
    return true;
  });
  const totalReparadas = entradasRep.length;
  const totalSinReparacion = sinRepFiltradas.length;
  const totalCerradas = totalReparadas + totalSinReparacion;
  const tasaCierre = totalCerradas > 0 ? Math.round((totalReparadas / totalCerradas) * 100) : null;

  // Tiempo medio — descarta valores imposibles (negativos o > 1 año)
  const conDias = entradasRep.filter((e) => e.dias !== null && e.dias !== undefined && e.dias >= 0 && e.dias < 365);
  const tiempoMedio =
    conDias.length > 0
      ? Math.round((conDias.reduce((s, e) => s + (e.dias || 0), 0) / conDias.length) * 10) / 10
      : null;

  // Rankings
  const agrupar = (clave: (e: EntradaReporte) => string, porDefecto: string): Record<string, ItemRanking> => {
    const mapa: Record<string, ItemRanking> = {};
    for (const e of entradasRep) {
      const k = clave(e) || porDefecto;
      if (!mapa[k]) mapa[k] = { nombre: k, count: 0, ganancia: 0 };
      mapa[k].count++;
      mapa[k].ganancia += e.ganancia;
    }
    return mapa;
  };
  const topModelos = Object.values(agrupar((e) => e.modelo || "", "Sin modelo"))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topSintomas = Object.values(agrupar((e) => e.sintoma || "", "Sin síntoma"))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topTecnicos = Object.values(agrupar((e) => e.tecnico || "", "Sin asignar")).sort(
    (a, b) => b.ganancia - a.ganancia
  );

  // Recepciones
  let recepFiltradas = datos.recepciones;
  if (anio) recepFiltradas = recepFiltradas.filter((r) => r.fecha.startsWith(anio));
  if (mes) recepFiltradas = recepFiltradas.filter((r) => r.fecha.slice(5, 7) === mes);
  const mapaRecep: Record<string, number> = {};
  for (const r of recepFiltradas) mapaRecep[r.fecha] = (mapaRecep[r.fecha] || 0) + 1;
  const recepcionesPorDia = Object.keys(mapaRecep)
    .sort()
    .map((fecha) => ({ fecha, count: mapaRecep[fecha] }));

  return {
    cerradasPeriodo,
    totalEntradas,
    gananciaPeriodo,
    ticketMedio,
    deltaCerradas: delta(cerradasPeriodo, antCount),
    deltaGanancia: delta(gananciaPeriodo, antGan),
    // Ticket del PERIODO vs el del periodo anterior. El original comparaba
    // el ticket acumulado de todo el histórico contra el del mes pasado
    // (bases distintas); aquí ambos lados son el mismo tipo de magnitud.
    deltaTicket: delta(cerradasPeriodo > 0 ? gananciaPeriodo / cerradasPeriodo : 0, antTicket),
    mesAnteriorLabel: MESES_CORTO[mesN === 1 ? 12 : mesN - 1],
    periodoLabel: mes ? MESES_NOMBRE[parseInt(mes, 10)] || mes : "este mes",
    tasaCierre,
    totalReparadas,
    totalSinReparacion,
    tiempoMedio,
    muestraTiempo: conDias.length,
    porDia,
    porMes,
    topModelos,
    topSintomas,
    topTecnicos,
    recepcionesPorDia,
    totalRecepciones: recepFiltradas.length,
  };
}

export function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function etiquetaMes(clave: string): string {
  const [anio, mes] = clave.split("-");
  return `${MESES_CORTO[parseInt(mes, 10)]} ${anio}`;
}
