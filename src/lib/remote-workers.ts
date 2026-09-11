/**
 * Teletrabajadores remotos — módulo dentro de Asistencia. Tipos +
 * mapeadores snake_case -> camelCase para /v1/asistencia/admin/remote-workers/*.
 * Mismo estilo que src/lib/campanas.ts.
 */

export type EstadoDispositivo = "conectado" | "inactivo" | "nunca_sincronizado" | "deshabilitado";

/** Estado de ACTIVIDAD del empleado (distinto del estado de conectividad
    del dispositivo, EstadoDispositivo) — combina horario (asistencia.
    calendario_horas) + fichajes (salida_comida/vuelta_comida) + si el
    dispositivo sigue comunicando. null = sin horario asignado, no se
    puede calcular. */
export type EstadoActividad = "WORKING" | "BREAK" | "OFFLINE" | "OUT_OF_SCHEDULE" | null;

export interface RemoteWorkerListItem {
  deviceId: number;
  deviceUuid: string;
  hostname: string;
  username: string;
  status: string;
  lastSeen: string | null;
  agentVersion: string | null;
  osVersion: string | null;
  employeeId: number | null;
  empleadoNombre: string | null;
  estado: EstadoDispositivo;
  estadoActividad: EstadoActividad;
  horarioLabel: string | null;
  tiempoLaboralEsperadoSeg: number | null;
  descansoSegHoy: number;
  productividadHorario: number | null;
  activeSecondsHoy: number;
  idleSecondsHoy: number;
  appPrincipal: string | null;
}

export interface AppCategory {
  id: number;
  applicationName: string;
  category: string;
  productive: boolean;
}

export interface ProductividadPorCategoria {
  segundosProductivos: number;
  segundosNoProductivos: number;
  segundosSinClasificar: number;
  porcentaje: number | null;
  sinClasificar: string[];
}

export interface RemoteWorkersDashboard {
  conectados: number;
  totalDispositivos: number;
  promedioActivoSeg: number;
  productividadPromedio: number | null;
  sesionesHoy: number;
}

export interface RemoteWorkerAppUsage {
  applicationName: string;
  seconds: number;
  percentage: number;
}

export interface RemoteWindowEvent {
  application: string;
  windowTitle: string | null;
  startedAt: string | null;
  endedAt: string | null;
  seconds: number;
}

export interface RemoteWorkerDetail {
  device: {
    deviceId: number;
    deviceUuid: string;
    hostname: string;
    username: string;
    status: string;
    lastSeen: string | null;
    agentVersion: string | null;
    osVersion: string | null;
    employeeId: number | null;
    empleadoNombre: string | null;
  };
  hoy: {
    activeSeconds: number;
    idleSeconds: number;
    primeraActividad: string | null;
    ultimaActividad: string | null;
  };
  applications: RemoteWorkerAppUsage[];
  windowEvents: RemoteWindowEvent[];
  productividadCategoria: ProductividadPorCategoria;
  horario: {
    estadoActividad: EstadoActividad;
    horarioLabel: string | null;
    tiempoLaboralEsperadoSeg: number | null;
    descansoSegHoy: number;
    productividadHorario: number | null;
  };
}

export interface RemoteWorkerHistoryRow {
  dia: string;
  activeSeconds: number;
  idleSeconds: number;
  productividad: number | null;
}

/** Reporte diario/semanal (Fase 9.5) — separa el tiempo activo del
    dispositivo en 3 cubos, según si cae dentro de una franja de
    calendario_horas: laboral (cuenta para productividad), descanso
    (huecos reales de fichaje salida_comida/vuelta_comida) o fuera de
    horario (nunca cuenta como productividad, aunque haya actividad). */
export interface ReporteDiario {
  empleadoId: number;
  empleadoNombre: string;
  dispositivo: { deviceId: number; hostname: string } | null;
  fecha: string;
  horarioLabel: string | null;
  tiempoLaboralEsperadoSeg: number | null;
  activoLaboralSeg: number;
  inactivoLaboralSeg: number;
  descansoSeg: number;
  fueraHorarioSeg: number;
  productividad: number | null;
}

export interface ReporteSemanal {
  empleadoId: number;
  empleadoNombre: string | null;
  dias: ReporteDiario[];
  totales: {
    diasTrabajados: number;
    activoLaboralSeg: number;
    inactivoLaboralSeg: number;
    descansoSeg: number;
    fueraHorarioSeg: number;
    productividad: number | null;
  };
}

export interface AnalyticsSupervisor {
  trabajadoresActivosHoy: number;
  productividadPromedio: number | null;
  tiempoActivoPromedioSeg: number;
  horasFueraHorarioSeg: number;
  descansosRegistrados: number;
  tabla: RemoteWorkerListItem[];
}

export interface TimelineSegmento {
  estado: "WORKING" | "BREAK" | "OUT_OF_SCHEDULE";
  inicio: string;
  fin: string;
  duracionSeg: number;
}

/** Reglas de alerta (Fase 9.6) — umbrales fijos, computadas en caliente
    sobre datos ya existentes (last_seen, reporteDiario, sesiones): sin
    conexión > 30 min, fuera de horario > 2h, sin actividad en jornada > 2h. */
export type TipoAlerta = "offline" | "fuera_horario_prolongado" | "sin_actividad_jornada";

export interface Alerta {
  tipo: TipoAlerta;
  mensaje: string;
  detalle: string;
}

export interface AlertaDispositivo {
  deviceId: number;
  hostname: string;
  employeeId: number | null;
  empleadoNombre: string | null;
  alertas: Alerta[];
}

export function mapearRemoteWorkerListItem(r: Record<string, unknown>): RemoteWorkerListItem {
  return {
    deviceId: Number(r.device_id),
    deviceUuid: String(r.device_uuid ?? ""),
    hostname: String(r.hostname ?? ""),
    username: String(r.username ?? ""),
    status: String(r.status ?? "activo"),
    lastSeen: (r.last_seen as string) ?? null,
    agentVersion: (r.agent_version as string) ?? null,
    osVersion: (r.os_version as string) ?? null,
    employeeId: r.employee_id === null || r.employee_id === undefined ? null : Number(r.employee_id),
    empleadoNombre: (r.empleado_nombre as string) ?? null,
    estado: (r.estado as EstadoDispositivo) ?? "nunca_sincronizado",
    estadoActividad: (r.estado_actividad as EstadoActividad) ?? null,
    horarioLabel: (r.horario_label as string) ?? null,
    tiempoLaboralEsperadoSeg: r.tiempo_laboral_esperado_seg === null || r.tiempo_laboral_esperado_seg === undefined ? null : Number(r.tiempo_laboral_esperado_seg),
    descansoSegHoy: Number(r.descanso_seg_hoy ?? 0),
    productividadHorario: r.productividad_horario === null || r.productividad_horario === undefined ? null : Number(r.productividad_horario),
    activeSecondsHoy: Number(r.active_seconds_hoy ?? 0),
    idleSecondsHoy: Number(r.idle_seconds_hoy ?? 0),
    appPrincipal: (r.app_principal as string) ?? null,
  };
}

export function mapearDashboard(r: Record<string, unknown>): RemoteWorkersDashboard {
  return {
    conectados: Number(r.conectados ?? 0),
    totalDispositivos: Number(r.totalDispositivos ?? 0),
    promedioActivoSeg: Number(r.promedioActivoSeg ?? 0),
    productividadPromedio: r.productividadPromedio === null || r.productividadPromedio === undefined ? null : Number(r.productividadPromedio),
    sesionesHoy: Number(r.sesionesHoy ?? 0),
  };
}

export function mapearDetalle(r: Record<string, unknown>): RemoteWorkerDetail {
  const device = r.device as Record<string, unknown>;
  const hoy = r.hoy as Record<string, unknown>;
  return {
    device: {
      deviceId: Number(device.device_id),
      deviceUuid: String(device.device_uuid ?? ""),
      hostname: String(device.hostname ?? ""),
      username: String(device.username ?? ""),
      status: String(device.status ?? "activo"),
      lastSeen: (device.last_seen as string) ?? null,
      agentVersion: (device.agent_version as string) ?? null,
      osVersion: (device.os_version as string) ?? null,
      employeeId: device.employee_id === null || device.employee_id === undefined ? null : Number(device.employee_id),
      empleadoNombre: (device.empleado_nombre as string) ?? null,
    },
    hoy: {
      activeSeconds: Number(hoy.active_seconds ?? 0),
      idleSeconds: Number(hoy.idle_seconds ?? 0),
      primeraActividad: (hoy.primera_actividad as string) ?? null,
      ultimaActividad: (hoy.ultima_actividad as string) ?? null,
    },
    applications: ((r.applications as Record<string, unknown>[]) ?? []).map((a) => ({
      applicationName: String(a.application_name ?? ""),
      seconds: Number(a.seconds ?? 0),
      percentage: Number(a.percentage ?? 0),
    })),
    windowEvents: ((r.windowEvents as Record<string, unknown>[]) ?? []).map((w) => ({
      application: String(w.application ?? ""),
      windowTitle: (w.window_title as string) ?? null,
      startedAt: (w.started_at as string) ?? null,
      endedAt: (w.ended_at as string) ?? null,
      seconds: Number(w.seconds ?? 0),
    })),
    productividadCategoria: mapearProductividadCategoria((r.productividadCategoria as Record<string, unknown>) ?? {}),
    horario: mapearHorario((r.horario as Record<string, unknown>) ?? {}),
  };
}

function mapearHorario(r: Record<string, unknown>): RemoteWorkerDetail["horario"] {
  return {
    estadoActividad: (r.estadoActividad as EstadoActividad) ?? null,
    horarioLabel: (r.horarioLabel as string) ?? null,
    tiempoLaboralEsperadoSeg: r.tiempoLaboralEsperadoSeg === null || r.tiempoLaboralEsperadoSeg === undefined ? null : Number(r.tiempoLaboralEsperadoSeg),
    descansoSegHoy: Number(r.descansoSegHoy ?? 0),
    productividadHorario: r.productividadHorario === null || r.productividadHorario === undefined ? null : Number(r.productividadHorario),
  };
}

function mapearProductividadCategoria(r: Record<string, unknown>): ProductividadPorCategoria {
  return {
    segundosProductivos: Number(r.segundosProductivos ?? 0),
    segundosNoProductivos: Number(r.segundosNoProductivos ?? 0),
    segundosSinClasificar: Number(r.segundosSinClasificar ?? 0),
    porcentaje: r.porcentaje === null || r.porcentaje === undefined ? null : Number(r.porcentaje),
    sinClasificar: Array.isArray(r.sinClasificar) ? (r.sinClasificar as string[]) : [],
  };
}

export function mapearCategoria(r: Record<string, unknown>): AppCategory {
  return {
    id: Number(r.id),
    applicationName: String(r.application_name ?? ""),
    category: String(r.category ?? ""),
    productive: Boolean(r.productive),
  };
}

export function mapearReporteDiario(r: Record<string, unknown>): ReporteDiario {
  const dispositivo = r.dispositivo as Record<string, unknown> | null;
  return {
    empleadoId: Number(r.empleadoId),
    empleadoNombre: String(r.empleadoNombre ?? ""),
    dispositivo: dispositivo ? { deviceId: Number(dispositivo.deviceId), hostname: String(dispositivo.hostname ?? "") } : null,
    fecha: String(r.fecha ?? ""),
    horarioLabel: (r.horarioLabel as string) ?? null,
    tiempoLaboralEsperadoSeg: r.tiempoLaboralEsperadoSeg === null || r.tiempoLaboralEsperadoSeg === undefined ? null : Number(r.tiempoLaboralEsperadoSeg),
    activoLaboralSeg: Number(r.activoLaboralSeg ?? 0),
    inactivoLaboralSeg: Number(r.inactivoLaboralSeg ?? 0),
    descansoSeg: Number(r.descansoSeg ?? 0),
    fueraHorarioSeg: Number(r.fueraHorarioSeg ?? 0),
    productividad: r.productividad === null || r.productividad === undefined ? null : Number(r.productividad),
  };
}

export function mapearReporteSemanal(r: Record<string, unknown>): ReporteSemanal {
  const totales = r.totales as Record<string, unknown>;
  return {
    empleadoId: Number(r.empleadoId),
    empleadoNombre: (r.empleadoNombre as string) ?? null,
    dias: ((r.dias as Record<string, unknown>[]) ?? []).map(mapearReporteDiario),
    totales: {
      diasTrabajados: Number(totales.diasTrabajados ?? 0),
      activoLaboralSeg: Number(totales.activoLaboralSeg ?? 0),
      inactivoLaboralSeg: Number(totales.inactivoLaboralSeg ?? 0),
      descansoSeg: Number(totales.descansoSeg ?? 0),
      fueraHorarioSeg: Number(totales.fueraHorarioSeg ?? 0),
      productividad: totales.productividad === null || totales.productividad === undefined ? null : Number(totales.productividad),
    },
  };
}

export function mapearAnalytics(r: Record<string, unknown>): AnalyticsSupervisor {
  return {
    trabajadoresActivosHoy: Number(r.trabajadoresActivosHoy ?? 0),
    productividadPromedio: r.productividadPromedio === null || r.productividadPromedio === undefined ? null : Number(r.productividadPromedio),
    tiempoActivoPromedioSeg: Number(r.tiempoActivoPromedioSeg ?? 0),
    horasFueraHorarioSeg: Number(r.horasFueraHorarioSeg ?? 0),
    descansosRegistrados: Number(r.descansosRegistrados ?? 0),
    tabla: ((r.tabla as Record<string, unknown>[]) ?? []).map(mapearRemoteWorkerListItem),
  };
}

export function mapearTimelineSegmento(r: Record<string, unknown>): TimelineSegmento {
  return {
    estado: r.estado as TimelineSegmento["estado"],
    inicio: String(r.inicio ?? ""),
    fin: String(r.fin ?? ""),
    duracionSeg: Number(r.duracionSeg ?? 0),
  };
}

export function mapearAlertaDispositivo(r: Record<string, unknown>): AlertaDispositivo {
  return {
    deviceId: Number(r.deviceId),
    hostname: String(r.hostname ?? ""),
    employeeId: r.employeeId === null || r.employeeId === undefined ? null : Number(r.employeeId),
    empleadoNombre: (r.empleadoNombre as string) ?? null,
    alertas: ((r.alertas as Record<string, unknown>[]) ?? []).map((a) => ({
      tipo: a.tipo as TipoAlerta,
      mensaje: String(a.mensaje ?? ""),
      detalle: String(a.detalle ?? ""),
    })),
  };
}

export const TIPO_ALERTA_COLOR: Record<TipoAlerta, { bg: string; color: string }> = {
  offline: { bg: "#e4e4e7", color: "#3f3f46" },
  fuera_horario_prolongado: { bg: "#fef3c7", color: "#92400e" },
  sin_actividad_jornada: { bg: "#fee2e2", color: "#991b1b" },
};

export function mapearHistorialRow(r: Record<string, unknown>): RemoteWorkerHistoryRow {
  return {
    dia: String(r.dia ?? ""),
    activeSeconds: Number(r.active_seconds ?? 0),
    idleSeconds: Number(r.idle_seconds ?? 0),
    productividad: r.productividad === null || r.productividad === undefined ? null : Number(r.productividad),
  };
}

export function mapearAppUsage(r: Record<string, unknown>): RemoteWorkerAppUsage {
  return {
    applicationName: String(r.application_name ?? ""),
    seconds: Number(r.seconds ?? 0),
    percentage: Number(r.percentage ?? 0),
  };
}

/** "7h 20m" — mismo formato que secondsToHm() en asistenciaServicio.js
    (backend), pero solo para mostrar en frontend, no se comparte código. */
export function formatDuracion(segundos: number): string {
  const h = Math.trunc(segundos / 3600);
  const m = Math.trunc((segundos % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function calcularProductividad(activeSeconds: number, idleSeconds: number): number | null {
  const total = activeSeconds + idleSeconds;
  if (total <= 0) return null;
  return Math.round((activeSeconds / total) * 10000) / 100;
}

export const ESTADO_DISPOSITIVO_LABEL: Record<EstadoDispositivo, string> = {
  conectado: "Activo",
  inactivo: "Inactivo",
  nunca_sincronizado: "Sin datos",
  deshabilitado: "Deshabilitado",
};

export const ESTADO_DISPOSITIVO_COLOR: Record<EstadoDispositivo, { bg: string; color: string }> = {
  conectado: { bg: "#d1fae5", color: "#065f46" },
  inactivo: { bg: "#fef3c7", color: "#92400e" },
  nunca_sincronizado: { bg: "#e4e4e7", color: "#3f3f46" },
  deshabilitado: { bg: "#fee2e2", color: "#991b1b" },
};

export const ESTADO_ACTIVIDAD_LABEL: Record<string, string> = {
  WORKING: "Trabajando",
  BREAK: "Descanso",
  OFFLINE: "Desconectado",
  OUT_OF_SCHEDULE: "Fuera de horario",
};

export const ESTADO_ACTIVIDAD_COLOR: Record<string, { bg: string; color: string }> = {
  WORKING: { bg: "#d1fae5", color: "#065f46" },
  BREAK: { bg: "#dbeafe", color: "#1e40af" },
  OFFLINE: { bg: "#e4e4e7", color: "#3f3f46" },
  OUT_OF_SCHEDULE: { bg: "#fef3c7", color: "#92400e" },
};
