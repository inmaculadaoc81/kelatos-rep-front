/**
 * Teletrabajadores remotos — módulo dentro de Asistencia. Tipos +
 * mapeadores snake_case -> camelCase para /v1/asistencia/admin/remote-workers/*.
 * Mismo estilo que src/lib/campanas.ts.
 */

export type EstadoDispositivo = "conectado" | "inactivo" | "nunca_sincronizado" | "deshabilitado";

export interface RemoteWorkerListItem {
  deviceId: number;
  deviceUuid: string;
  hostname: string;
  username: string;
  status: string;
  lastSeen: string | null;
  employeeId: number | null;
  empleadoNombre: string | null;
  estado: EstadoDispositivo;
  activeSecondsHoy: number;
  idleSecondsHoy: number;
  appPrincipal: string | null;
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
}

export interface RemoteWorkerHistoryRow {
  dia: string;
  activeSeconds: number;
  idleSeconds: number;
  productividad: number | null;
}

export function mapearRemoteWorkerListItem(r: Record<string, unknown>): RemoteWorkerListItem {
  return {
    deviceId: Number(r.device_id),
    deviceUuid: String(r.device_uuid ?? ""),
    hostname: String(r.hostname ?? ""),
    username: String(r.username ?? ""),
    status: String(r.status ?? "activo"),
    lastSeen: (r.last_seen as string) ?? null,
    employeeId: r.employee_id === null || r.employee_id === undefined ? null : Number(r.employee_id),
    empleadoNombre: (r.empleado_nombre as string) ?? null,
    estado: (r.estado as EstadoDispositivo) ?? "nunca_sincronizado",
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
  };
}

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
