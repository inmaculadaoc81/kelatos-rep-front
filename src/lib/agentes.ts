/**
 * Plataforma de Agentes IA — tipos y mapeadores. Shell pensado para
 * alojar más de un tipo de agente: AgentType viene del backend
 * (GET /v1/agentes/tipos), nunca hardcodeado en el frontend, así que un
 * agente nuevo aparece en la lista/sidebar sin tocar este archivo.
 */

export type AgentRunStatus = "queued" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled";
export type OutreachMessageStatus = "draft" | "approved" | "rejected";

export interface AgentType {
  type: string;
  label: string;
  description: string;
  /** Tiene un run en 'queued' o 'running' ahora mismo. */
  activo: boolean;
}

export interface AgentRun {
  id: number;
  agentType: string;
  goalText: string;
  input: Record<string, unknown>;
  status: AgentRunStatus;
  progress: Record<string, unknown>;
  totalCostUsd: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  createdBy: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

export interface AgentStep {
  id: number;
  runId: number;
  step: string;
  kind: "deterministic" | "agentic" | "tool_call";
  companyId: number | null;
  status: "running" | "completed" | "failed" | "skipped";
  output: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface AgentLead {
  companyId: number;
  name: string;
  website: string | null;
  sector: string | null;
  location: string | null;
  score: number | null;
  reason: string | null;
  painPoints: string[];
  recommendedService: string | null;
  confidence: number | null;
  messageId: number | null;
  channel: string | null;
  subject: string | null;
  message: string | null;
  messageStatus: OutreachMessageStatus | null;
}

interface FilaAgentRunSql {
  id: number | string;
  agent_type: string;
  goal_text: string;
  input?: Record<string, unknown> | null;
  status: AgentRunStatus;
  progress?: Record<string, unknown> | null;
  total_cost_usd: string | number;
  total_tokens_input: number | string;
  total_tokens_output: number | string;
  created_by: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error?: string | null;
}

interface FilaAgentStepSql {
  id: number | string;
  run_id: number | string;
  step: string;
  kind: "deterministic" | "agentic" | "tool_call";
  company_id: number | string | null;
  status: "running" | "completed" | "failed" | "skipped";
  output: unknown;
  error: string | null;
  duration_ms: number | string | null;
  created_at: string;
}

interface FilaAgentLeadSql {
  company_id: number | string;
  name: string;
  website: string | null;
  sector: string | null;
  location: string | null;
  score: string | number | null;
  reason: string | null;
  pain_points: string[] | null;
  recommended_service: string | null;
  confidence: string | number | null;
  message_id: number | string | null;
  channel: string | null;
  subject: string | null;
  message: string | null;
  message_status: OutreachMessageStatus | null;
}

export function mapearAgentRun(row: FilaAgentRunSql): AgentRun {
  return {
    id: Number(row.id),
    agentType: row.agent_type,
    goalText: row.goal_text,
    input: row.input || {},
    status: row.status,
    progress: row.progress || {},
    totalCostUsd: Number(row.total_cost_usd) || 0,
    totalTokensInput: Number(row.total_tokens_input) || 0,
    totalTokensOutput: Number(row.total_tokens_output) || 0,
    createdBy: row.created_by,
    createdAt: row.created_at,
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    error: row.error || null,
  };
}

export function mapearAgentStep(row: FilaAgentStepSql): AgentStep {
  return {
    id: Number(row.id),
    runId: Number(row.run_id),
    step: row.step,
    kind: row.kind,
    companyId: row.company_id === null || row.company_id === undefined ? null : Number(row.company_id),
    status: row.status,
    output: (row.output && typeof row.output === "object" ? row.output : null) as Record<string, unknown> | null,
    error: row.error || null,
    durationMs: row.duration_ms === null || row.duration_ms === undefined ? null : Number(row.duration_ms),
    createdAt: row.created_at,
  };
}

export function mapearAgentLead(row: FilaAgentLeadSql): AgentLead {
  return {
    companyId: Number(row.company_id),
    name: row.name,
    website: row.website || null,
    sector: row.sector || null,
    location: row.location || null,
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    reason: row.reason || null,
    painPoints: Array.isArray(row.pain_points) ? row.pain_points : [],
    recommendedService: row.recommended_service || null,
    confidence: row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
    messageId: row.message_id === null || row.message_id === undefined ? null : Number(row.message_id),
    channel: row.channel || null,
    subject: row.subject || null,
    message: row.message || null,
    messageStatus: row.message_status || null,
  };
}

export const ESTADO_RUN_LABEL: Record<AgentRunStatus, string> = {
  queued: "En cola",
  running: "En ejecución",
  waiting_approval: "Esperando aprobación",
  completed: "Completado",
  failed: "Fallido",
  cancelled: "Cancelado",
};

export const ESTADO_RUN_COLOR: Record<AgentRunStatus, { bg: string; color: string }> = {
  queued: { bg: "#e5e7eb", color: "#374151" },
  running: { bg: "#dbeafe", color: "#1e40af" },
  waiting_approval: { bg: "#fef3c7", color: "#92400e" },
  completed: { bg: "#dcfce7", color: "#166534" },
  failed: { bg: "#fee2e2", color: "#991b1b" },
  cancelled: { bg: "#e5e7eb", color: "#374151" },
};
