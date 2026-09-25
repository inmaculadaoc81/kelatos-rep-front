/**
 * Agentes V2 (AI Marketing System) — tipos y utilidades del frontend.
 * Los departamentos, sus campos y sus horarios vienen del backend (/v1/marketing): nada de esto
 * asume un número ni un nombre fijo de departamentos.
 */

export type EstadoDepartamento = "draft" | "active" | "paused" | "disabled";
export type EstadoRun = "scheduled" | "queued" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled" | "timed_out" | "budget_exceeded";
export type EstadoAprobacion = "draft" | "pending_approval" | "approved" | "rejected" | "scheduled" | "executed" | "failed";

export interface DepartamentoResumen {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  status: EstadoDepartamento;
  sort_order: number;
}

export interface DepartamentoPanel extends DepartamentoResumen {
  workflows: number;
  agents: number;
  schedules: number;
  pending_approvals: number;
  last_run: { status: EstadoRun; finished_at: string | null; started_at: string | null } | null;
  next_run_at: string | null;
}

export interface RunFila {
  id: string;
  status: EstadoRun;
  trigger: string;
  scheduled_for: string | null;
  started_at: string | null;
  finished_at: string | null;
  agent_cost_usd: number;
  error?: string | null;
  department_key?: string;
  department_name?: string;
  workflow_name?: string | null;
  agent_runs?: number;
  attempts?: number;
  max_attempts?: number;
  current_stage?: number;
  cancel_requested?: boolean;
}

export interface Panel {
  ok: boolean;
  departments: DepartamentoPanel[];
  upcoming: { at: string; department_key: string; department_name: string; schedule: string }[];
  pending_approvals: number;
  recent_runs: RunFila[];
  costs: { agent_cost_usd_30d: number; ad_spend_30d: { currency: string; total: number }[] };
  metrics: { metric: string; value: number; unit: string; department_id: string | null; recorded_at: string }[];
  cmo: { available: boolean };
}

export interface Horario {
  id?: string;
  workflow_id: string | null;
  name: string;
  kind: "weekly" | "interval";
  days_of_week: number[];
  times: string[];
  interval_minutes: number | null;
  timezone: string;
  enabled: boolean;
}

export interface ConfiguracionDepartamento {
  targetAudience?: string;
  topics?: string[];
  goals?: string[];
  tone?: string;
  frequency?: number | null;
  channels?: string[];
  [otro: string]: unknown;
}

export interface DetalleDepartamento {
  ok: boolean;
  department: DepartamentoResumen & { config_schema: { fields?: string[] } };
  settings: { configuration: ConfiguracionDepartamento; version: number; updated_at: string | null; updated_by: string | null };
  workflows: { id: string; key: string; name: string; description: string; definition: { stages?: unknown[] }; enabled: boolean }[];
  agents: { id: string; workflow_id: string | null; agent_key: string; agent_type: string | null; role: string; enabled: boolean }[];
  schedules: Horario[];
  upcoming: { at: string; schedule: string }[];
  runs: RunFila[];
  metrics: { metric: string; value: number; unit: string; recorded_at: string }[];
}

export const ETIQUETA_ESTADO_DEPARTAMENTO: Record<EstadoDepartamento, string> = {
  draft: "En preparación",
  active: "Activo",
  paused: "En pausa",
  disabled: "Desactivado",
};

export const COLOR_ESTADO_DEPARTAMENTO: Record<EstadoDepartamento, string> = {
  draft: "bg-slate-500/10 text-slate-600",
  active: "bg-green-500/10 text-green-700",
  paused: "bg-amber-500/10 text-amber-700",
  disabled: "bg-red-500/10 text-red-700",
};

export const ETIQUETA_ESTADO_RUN: Record<EstadoRun, string> = {
  scheduled: "Programada",
  queued: "En cola",
  running: "En curso",
  waiting_approval: "Espera aprobación",
  completed: "Completada",
  failed: "Fallida",
  cancelled: "Cancelada",
  timed_out: "Tiempo agotado",
  budget_exceeded: "Presupuesto superado",
};

export const COLOR_ESTADO_RUN: Record<EstadoRun, string> = {
  scheduled: "bg-slate-500/10 text-slate-600",
  queued: "bg-sky-500/10 text-sky-700",
  running: "bg-blue-500/10 text-blue-700",
  waiting_approval: "bg-amber-500/10 text-amber-700",
  completed: "bg-green-500/10 text-green-700",
  failed: "bg-red-500/10 text-red-700",
  cancelled: "bg-slate-500/10 text-slate-600",
  timed_out: "bg-orange-500/10 text-orange-700",
  budget_exceeded: "bg-red-500/10 text-red-700",
};

export const ETIQUETA_ESTADO_APROBACION: Record<EstadoAprobacion, string> = {
  draft: "Borrador",
  pending_approval: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  scheduled: "Programado",
  executed: "Ejecutado",
  failed: "Fallido",
};

export const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"] as const;

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Fecha y hora completas (25/09/2026 20:32) en la hora local del navegador; "—" si no hay fecha. */
export function fechaHoraLarga(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function duracion(desde: string | null, hasta: string | null): string {
  if (!desde || !hasta) return "—";
  const s = Math.max(0, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 1000));
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
}

export function usd(n: number): string {
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 })} US$`;
}

/** Frase corta para una próxima ejecución: "hoy 09:00", "mañana 09:00" o "vie 27/09 09:00". */
export function cuando(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (mismoDia(d, hoy)) return `hoy ${hora}`;
  if (mismoDia(d, new Date(hoy.getTime() + 86400000))) return `mañana ${hora}`;
  return `${d.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit" })} ${hora}`;
}
