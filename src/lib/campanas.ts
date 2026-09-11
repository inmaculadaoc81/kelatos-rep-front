/**
 * Campañas de agentes IA (equipo de marketing). Una campaña es el
 * objetivo de negocio; contiene varios agent_runs. El backend expone
 * /v1/campaigns/*. Tipos + mapeadores snake_case -> camelCase.
 */

export type CampaignStatus =
  | "draft"
  | "planning"
  | "running"
  | "waiting_approval"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled"
  | "budget_exceeded";

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Borrador",
  planning: "Planificando",
  running: "En curso",
  waiting_approval: "Esperando aprobación",
  approved: "Aprobada",
  executing: "Enviando",
  completed: "Completada",
  failed: "Fallida",
  cancelled: "Cancelada",
  budget_exceeded: "Presupuesto agotado",
};

export const CAMPAIGN_STATUS_COLOR: Record<CampaignStatus, { bg: string; color: string }> = {
  draft: { bg: "#eef0f3", color: "#4b5563" },
  planning: { bg: "#e8edfc", color: "#2451c4" },
  running: { bg: "#e8edfc", color: "#2451c4" },
  waiting_approval: { bg: "#fdf0d5", color: "#9a6700" },
  approved: { bg: "#dcfce7", color: "#166534" },
  executing: { bg: "#e0f2fe", color: "#0369a1" },
  completed: { bg: "#dcfce7", color: "#166534" },
  failed: { bg: "#fee2e2", color: "#991b1b" },
  cancelled: { bg: "#eef0f3", color: "#4b5563" },
  budget_exceeded: { bg: "#ffedd5", color: "#9a3412" },
};

export interface CampaignPlan {
  icp: string;
  sectors: string[];
  locations: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  valueProposition: string;
  channels: string[];
  targetLeads: number;
}

export interface CampaignSourceConfig {
  mode: "external" | "internal" | "hybrid";
  externalProviders?: string[];
  internalFilters?: Record<string, unknown>;
  sector?: string;
  location?: string;
  limit: number;
  /** Opt-in: activa las 3 etapas de LinkedIn Intelligence para esta campaña. */
  enableLinkedin?: boolean;
}

export interface Campaign {
  id: number;
  slug: string;
  name: string;
  goalText: string;
  status: CampaignStatus;
  plan: CampaignPlan | null;
  sourceConfig: CampaignSourceConfig | null;
  targetLeads: number | null;
  maxCostUsd: number;
  costUsd: number;
  createdBy: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

export interface AgentEvent {
  id: number;
  createdAt: string;
  agentSlug: string;
  kind: string;
  action: string;
  summary: string;
  data: Record<string, unknown> | null;
  companyId: number | null;
  companyName: string | null;
}

export type LeadMessageStatus = "draft" | "approved" | "rejected" | "dispatched" | null;

export interface CampaignLead {
  companyId: number;
  name: string;
  website: string | null;
  sector: string | null;
  location: string | null;
  score: number | null;
  fit: string | null;
  reason: string | null;
  opportunities: string[];
  risks: string[];
  confidence: number | null;
  briefSummary: string | null;
  briefConfidence: number | null;
  digitalMaturity: string | null;
  briefOpportunities: string[];
  possibleProblems: string[];
  services: string[];
  facts: { statement: string; evidenceUrls?: string[] }[];
  inferences: { statement: string; basedOnFacts?: number[]; confidence?: number }[];
  evidence: { type: string; url: string | null; statement: string | null; text: string | null }[];
  offer: string | null;
  angle: string | null;
  rationale: string | null;
  offerEvidence: string[];
  messageId: number | null;
  channel: string | null;
  subject: string | null;
  message: string | null;
  messageStatus: LeadMessageStatus;
  dispatchedAt: string | null;
}

export type LinkedInMessageStatus = "draft" | "approved" | "rejected" | "sent_manually" | null;

export const CONTACT_ROLE_LABEL: Record<string, string> = {
  ceo: "CEO",
  founder: "Fundador/a",
  director_general: "Director/a General",
  director_comercial: "Director/a Comercial",
  responsable_marketing: "Responsable de Marketing",
  responsable_ti: "Responsable de TI",
  responsable_innovacion: "Responsable de Innovación",
  other: "Otro",
};

export interface LinkedInContact {
  contactId: number;
  companyId: number;
  companyName: string;
  contactName: string;
  roleTitle: string | null;
  roleCategory: string;
  linkedinUrl: string | null;
  score: number | null;
  reason: string | null;
  seniority: string | null;
  responsibilities: string[];
  possiblePainPoints: string[];
  signals: string[];
  facts: { statement: string; evidenceUrls?: string[] }[];
  inferences: { statement: string; basedOnFacts?: number[]; confidence?: number }[];
  analysisConfidence: number | null;
  messageId: number | null;
  message: string | null;
  messageStatus: LinkedInMessageStatus;
  evidenceRefs: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  markedSentBy: string | null;
  markedSentAt: string | null;
}

export function mapearLinkedInContact(r: Record<string, unknown>): LinkedInContact {
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  return {
    contactId: Number(r.contact_id),
    companyId: Number(r.company_id),
    companyName: String(r.company_name ?? ""),
    contactName: String(r.contact_name ?? ""),
    roleTitle: (r.role_title as string) ?? null,
    roleCategory: String(r.role_category ?? "other"),
    linkedinUrl: (r.linkedin_url as string) ?? null,
    score: r.score === null || r.score === undefined ? null : Number(r.score),
    reason: (r.reason as string) ?? null,
    seniority: (r.seniority as string) ?? null,
    responsibilities: arr(r.responsibilities),
    possiblePainPoints: arr(r.possible_pain_points),
    signals: arr(r.signals),
    facts: Array.isArray(r.facts) ? (r.facts as LinkedInContact["facts"]) : [],
    inferences: Array.isArray(r.inferences) ? (r.inferences as LinkedInContact["inferences"]) : [],
    analysisConfidence: r.analysis_confidence === null || r.analysis_confidence === undefined ? null : Number(r.analysis_confidence),
    messageId: r.message_id === null || r.message_id === undefined ? null : Number(r.message_id),
    message: (r.message as string) ?? null,
    messageStatus: (r.message_status as LinkedInMessageStatus) ?? null,
    evidenceRefs: arr(r.evidence_refs),
    reviewedBy: (r.reviewed_by as string) ?? null,
    reviewedAt: (r.reviewed_at as string) ?? null,
    markedSentBy: (r.marked_sent_by as string) ?? null,
    markedSentAt: (r.marked_sent_at as string) ?? null,
  };
}

export interface CampaignBudget {
  maxCostUsd: number;
  costUsd: number;
  remainingUsd: number;
  byResource: { resource: string; calls: number; cost_usd: string }[];
}

/* ── mapeadores ────────────────────────────────────────────────────── */

export function mapearCampaign(r: Record<string, unknown>): Campaign {
  return {
    id: Number(r.id),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    goalText: String(r.goal_text ?? r.goalText ?? ""),
    status: (r.status as CampaignStatus) ?? "draft",
    plan: (r.plan as CampaignPlan) ?? null,
    sourceConfig: (r.source_config as CampaignSourceConfig) ?? (r.sourceConfig as CampaignSourceConfig) ?? null,
    targetLeads: r.target_leads === null || r.target_leads === undefined ? null : Number(r.target_leads),
    maxCostUsd: Number(r.max_cost_usd ?? r.maxCostUsd ?? 0),
    costUsd: Number(r.cost_usd ?? r.costUsd ?? 0),
    createdBy: String(r.created_by ?? r.createdBy ?? ""),
    createdAt: String(r.created_at ?? r.createdAt ?? ""),
    startedAt: (r.started_at as string) ?? (r.startedAt as string) ?? null,
    finishedAt: (r.finished_at as string) ?? (r.finishedAt as string) ?? null,
    error: (r.error as string) ?? null,
  };
}

export function mapearEvento(r: Record<string, unknown>): AgentEvent {
  return {
    id: Number(r.id),
    createdAt: String(r.created_at ?? ""),
    agentSlug: String(r.agent_slug ?? ""),
    kind: String(r.kind ?? ""),
    action: String(r.action ?? ""),
    summary: String(r.summary ?? ""),
    data: (r.data as Record<string, unknown>) ?? null,
    companyId: r.company_id === null || r.company_id === undefined ? null : Number(r.company_id),
    companyName: (r.company_name as string) ?? null,
  };
}

export function mapearLead(r: Record<string, unknown>): CampaignLead {
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  return {
    companyId: Number(r.company_id),
    name: String(r.name ?? ""),
    website: (r.website as string) ?? null,
    sector: (r.sector as string) ?? null,
    location: (r.location as string) ?? null,
    score: r.score === null || r.score === undefined ? null : Number(r.score),
    fit: (r.fit as string) ?? null,
    reason: (r.reason as string) ?? null,
    opportunities: arr(r.opportunities),
    risks: arr(r.risks),
    confidence: r.confidence === null || r.confidence === undefined ? null : Number(r.confidence),
    briefSummary: (r.brief_summary as string) ?? null,
    briefConfidence: r.brief_confidence === null || r.brief_confidence === undefined ? null : Number(r.brief_confidence),
    digitalMaturity: (r.digital_maturity as string) ?? null,
    briefOpportunities: arr(r.brief_opportunities),
    possibleProblems: arr(r.possible_problems),
    services: arr(r.services),
    facts: Array.isArray(r.facts) ? (r.facts as CampaignLead["facts"]) : [],
    inferences: Array.isArray(r.inferences) ? (r.inferences as CampaignLead["inferences"]) : [],
    evidence: Array.isArray(r.evidence) ? (r.evidence as CampaignLead["evidence"]) : [],
    offer: (r.offer as string) ?? null,
    angle: (r.angle as string) ?? null,
    rationale: (r.rationale as string) ?? null,
    offerEvidence: arr(r.offer_evidence),
    messageId: r.message_id === null || r.message_id === undefined ? null : Number(r.message_id),
    channel: (r.channel as string) ?? null,
    subject: (r.subject as string) ?? null,
    message: (r.message as string) ?? null,
    messageStatus: (r.message_status as LeadMessageStatus) ?? null,
    dispatchedAt: (r.dispatched_at as string) ?? null,
  };
}

/** Etapas del pipeline, en orden, para el stepper. La clave coincide con
    los conteos de campaign.progress / agent_events. */
export const PIPELINE_STAGES: { key: string; label: string; progressKey?: string }[] = [
  { key: "campaign_planner", label: "Plan" },
  { key: "discovery", label: "Descubrimiento", progressKey: "companiesFound" },
  { key: "dedupe_filter", label: "Filtro", progressKey: "companiesCandidate" },
  { key: "enrich", label: "Enriquecido", progressKey: "companiesEnriched" },
  { key: "heuristic_rank", label: "Ranking", progressKey: "companiesRanked" },
  { key: "batch_classify", label: "Clasificación", progressKey: "companiesCheapPass" },
  { key: "web_research", label: "Research", progressKey: "companiesResearched" },
  { key: "qualification", label: "Calificación", progressKey: "companiesQualified" },
  { key: "offer_strategy", label: "Oferta", progressKey: "companiesWithOffer" },
  { key: "linkedin_contact_discovery", label: "Contactos LinkedIn", progressKey: "contactsFound" },
  { key: "linkedin_contact_analysis", label: "Análisis contactos", progressKey: "contactsAnalyzed" },
  { key: "linkedin_message_strategy", label: "Mensajes LinkedIn", progressKey: "linkedinDraftsCreated" },
  { key: "outreach", label: "Borradores", progressKey: "draftsCreated" },
];

export const SERVICE_LABEL: Record<string, string> = {
  whatsapp_automation: "Automatización WhatsApp",
  web_dev: "Desarrollo web",
  digital_marketing: "Marketing digital",
  none: "No contactar",
};
