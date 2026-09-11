"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserCheck, Check, X, Maximize2, Minimize2, Send, Sparkles } from "lucide-react";
import { Global, Cpu } from "@/lib/icons";
import { AgentLead, AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import type { AgentEvent, CampaignLead, CampaignBudget } from "@/lib/campanas";
import { SERVICE_LABEL, mapearLead } from "@/lib/campanas";

/** Lead que renderiza el canvas: AgentLead + extras de campaña (opcionales). */
type LeadUI = AgentLead & {
  fit?: string | null;
  offer?: string | null;
  angle?: string | null;
  rationale?: string | null;
  briefSummary?: string | null;
  briefOpportunities?: string[];
  riskList?: string[];
  facts?: { statement: string; evidenceUrls?: string[] }[];
  inferences?: { statement: string; confidence?: number }[];
  evidence?: { type: string; url: string | null; statement: string | null }[];
};

function campaignLeadToUI(c: CampaignLead): LeadUI {
  return {
    companyId: c.companyId,
    name: c.name,
    website: c.website,
    sector: c.sector,
    location: c.location,
    score: c.score,
    reason: c.reason,
    painPoints: c.possibleProblems ?? [],
    recommendedService: c.offer && c.offer !== "none" ? (SERVICE_LABEL[c.offer] ?? c.offer) : null,
    confidence: c.confidence,
    messageId: c.messageId,
    channel: c.channel,
    subject: c.subject,
    message: c.message,
    messageStatus: (c.messageStatus as AgentLead["messageStatus"]) ?? null,
    fit: c.fit,
    offer: c.offer,
    angle: c.angle,
    rationale: c.rationale,
    briefSummary: c.briefSummary,
    briefOpportunities: c.opportunities?.length ? c.opportunities : c.briefOpportunities,
    riskList: c.risks,
    facts: c.facts,
    inferences: c.inferences,
    evidence: c.evidence,
  };
}
import { PillBadge } from "@/components/pill-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useConfirm } from "@/components/confirm-provider";

// Canvas de tarjetas (mismo lenguaje visual que un editor de agentes tipo
// flow-builder) pero con datos reales de ESTE run, no decorativo:
// "Entrada" es run.input de verdad, "Herramientas" lista las tools reales
// que el agente puede usar y se enciende en azul solo mientras el paso
// discovery está corriendo de verdad, "Modelos" son los dos niveles del
// embudo de coste, "Embudo" es el embudo real (encontradas → candidatas →
// pase rápido → calificadas) sacado de run.progress, y "Leads" son los
// leads calificados de verdad, con aprobar/rechazar cableado al mismo
// PATCH /v1/agentes/runs/:id/leads/:companyId que ya usaba la tabla.
// Si un paso falla, la tarjeta afectada se pinta en rojo (discovery →
// Herramientas, un paso de IA → Modelos + Embudo, cualquier fallo → Agente).
//
// Layout: 3 columnas posicionadas en % (left/width) sobre el mismo
// sistema de coordenadas que el viewBox del SVG de conectores. Cada
// columna es un flex column con `gap` uniforme, así la separación
// vertical entre tarjetas es constante aunque cada tarjeta tenga una
// altura distinta según su contenido.
const ESTADO_MENSAJE_LABEL: Record<string, string> = { draft: "Borrador", approved: "Aprobado", rejected: "Rechazado" };
const ESTADO_MENSAJE_COLOR: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#e5e7eb", color: "#374151" },
  approved: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

/** Herramientas / fuentes que el agente usa detrás de findBusinesses y de
    la resolución de webs. El icono es el favicon real de cada servicio. */
const HERRAMIENTAS: { nombre: string; detalle: string; dominio: string }[] = [
  { nombre: "infoisinfo", detalle: "Directorio de empresas", dominio: "infoisinfo.es" },
  { nombre: "DuckDuckGo", detalle: "Búsqueda de webs", dominio: "duckduckgo.com" },
  { nombre: "Google", detalle: "Places · resolución de webs", dominio: "google.com" },
];

/** Favicon de un servicio (vía el servicio de favicons de Google). Si no
    carga, cae a un icono genérico — nunca deja un hueco roto. */
function FaviconApp({ dominio, alt }: { dominio: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Global className="size-3.5" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${dominio}&sz=64`}
      alt={alt}
      width={24}
      height={24}
      className="size-6 shrink-0 rounded-md border border-border bg-white object-contain p-0.5"
      onError={() => setError(true)}
    />
  );
}

/** Los dos niveles de modelo del embudo de coste. Son los valores por
    defecto de AGENTES_OPENAI_MODEL_CHEAP/DEEP en el backend (mismo criterio
    que HERRAMIENTAS: se muestran fijos, no hay endpoint de config todavía). */
const MODELOS = [
  { nombre: "gpt-4o-mini", rol: "Filtro barato · todas las candidatas", dot: "bg-teal-500" },
  { nombre: "gpt-4o", rol: "Análisis profundo y redacción", dot: "bg-violet-500" },
];

const ERROR_CLASE = "border-destructive bg-destructive/5";

function tokensCompacto(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// Módulo (no en el render) para no llamar a Date.now() de forma impura.
function duracionRunMs(run: AgentRun): number {
  if (!run.startedAt) return 0;
  const fin = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  return Math.max(0, fin - new Date(run.startedAt).getTime());
}

function formatearDuracion(ms: number): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

function Punto({ x, y, activo }: { x: number; y: number; activo: boolean }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={0.6}
      className={activo ? "fill-blue-500" : "fill-muted-foreground/40"}
    />
  );
}

// Mismo patrón que la referencia del usuario: título con flecha arriba
// (sin caja propia) y el contenido en una caja aparte, ambas con
// border-radius 24 (rounded-3xl). Sin posición propia: fluye dentro de su
// columna con `gap` uniforme.
function Tarjeta({
  titulo,
  children,
  claseExterior,
}: {
  titulo: React.ReactNode;
  children: React.ReactNode;
  /** Sobrescribe fondo/borde del contenedor exterior (p.ej. "Leads" en
      celeste con borde punteado) — la caja interior blanca no cambia. */
  claseExterior?: string;
}) {
  return (
    <div
      className={`shrink-0 rounded-[22px] border pt-3 pb-1 shadow-sm ${claseExterior || "border-border bg-[#F9FAFB]"}`}
    >
      <p className="mb-2 flex items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground">
        <ChevronDown className="size-3.5" /> {titulo}
      </p>
      <div className="mx-1 rounded-[16px] border bg-card p-3">{children}</div>
    </div>
  );
}

// Sub-agentes del equipo de marketing, en el orden del pipeline.
const EQUIPO: { slug: string; label: string; dot: string; contar: (e: AgentEvent[]) => string }[] = [
  { slug: "campaign_planner", label: "Campaign Planner", dot: "bg-violet-500",
    contar: (e) => (e.some((x) => x.action === "plan_ready") ? "plan listo" : "—") },
  { slug: "marketing_manager", label: "Marketing Manager", dot: "bg-amber-500",
    contar: (e) => `${e.length} decisión${e.length !== 1 ? "es" : ""}` },
  { slug: "web_research", label: "Web Research", dot: "bg-cyan-600",
    contar: (e) => `${e.filter((x) => x.action === "brief_ready").length} briefs` },
  { slug: "qualification", label: "Qualification", dot: "bg-emerald-500",
    contar: (e) => `${e.filter((x) => x.action === "qualified").length} calificados` },
  { slug: "offer_strategy", label: "Offer Strategist", dot: "bg-blue-500",
    contar: (e) => `${e.filter((x) => x.action === "chose_offer").length} ofertas` },
  { slug: "outreach", label: "Outreach", dot: "bg-orange-500",
    contar: (e) => `${e.filter((x) => x.action === "draft_ready").length} borradores` },
];

export function CanvasAgente({
  run,
  steps,
  tipoLabel,
  eventos,
  campanaId,
  budget,
}: {
  run: AgentRun;
  steps: AgentStep[];
  tipoLabel: string;
  /** Cuando se pasa (campañas), el canvas añade la tarjeta "Equipo". */
  eventos?: AgentEvent[];
  /** Id de campaña: cambia el origen de leads/aprobación al endpoint de campaña. */
  campanaId?: number;
  budget?: CampaignBudget;
}) {
  const confirmar = useConfirm();
  const color = ESTADO_RUN_COLOR[run.status];
  const progreso = run.progress as Record<string, number | undefined>;

  const [leads, setLeads] = useState<LeadUI[]>([]);
  // Lead cuyo detalle está abierto en el modal (click en la fila del card
  // "Leads"). El objeto se refresca desde `leads` en cada render mientras
  // el modal está abierto, así el estado del mensaje no se queda viejo.
  const [leadAbiertoId, setLeadAbiertoId] = useState<number | null>(null);

  // Botón "ampliar" en la esquina: pone el canvas a pantalla completa de
  // verdad (Fullscreen API). Las tarjetas usan coordenadas porcentuales,
  // así que se reajustan solas al nuevo tamaño.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [ampliado, setAmpliado] = useState(false);

  useEffect(() => {
    const alCambiar = () => setAmpliado(document.fullscreenElement === canvasRef.current);
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);

  function alternarAmpliado() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      canvasRef.current?.requestFullscreen().catch(() => {});
    }
  }

  async function cargarLeads() {
    try {
      if (campanaId) {
        const res = await fetch(`/api/agentes/campanas/${campanaId}/leads`);
        const data = await res.json();
        if (data.ok) setLeads((data.leads as Record<string, unknown>[]).map((r) => campaignLeadToUI(mapearLead(r))));
      } else {
        const res = await fetch(`/api/agentes/runs/${run.id}/leads`);
        const data = await res.json();
        if (data.ok) setLeads(data.leads as LeadUI[]);
      }
    } catch {
      // silencioso — la tarjeta se queda con lo último que cargó bien
    }
  }

  useEffect(() => {
    cargarLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id, run.status]);

  async function revisar(lead: LeadUI, status: "approved" | "rejected") {
    if (status === "rejected") {
      const ok = await confirmar(`¿Rechazar el mensaje para "${lead.name}"? No se enviará nada.`, { titulo: "Rechazar lead" });
      if (!ok) return;
    }
    try {
      const url = campanaId
        ? `/api/agentes/campanas/${campanaId}/leads/${lead.companyId}`
        : `/api/agentes/runs/${run.id}/leads/${lead.companyId}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      await cargarLeads();
    } catch {
      // el botón simplemente no cambia de estado — sin toast aquí para no
      // competir con los del panel de traza en la misma acción del usuario
    }
  }

  async function revisarYCerrar(lead: LeadUI, status: "approved" | "rejected") {
    await revisar(lead, status);
    setLeadAbiertoId(null);
  }

  function abrirLead(lead: LeadUI) {
    // Si el canvas está a pantalla completa, el modal (portal en <body>)
    // quedaría detrás del elemento fullscreen — se sale de fullscreen para
    // que se vea centrado en la página.
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setLeadAbiertoId(lead.companyId);
  }

  const discoveryActivo = steps.some((s) => s.step === "discovery" && s.status === "running");
  const pipelineActivo = steps.some((s) => ["cheap_pass", "deep_analysis", "message_writer"].includes(s.step) && s.status === "running");
  const discoveryFallo = steps.some((s) => s.step === "discovery" && s.status === "failed");
  const pipelineFallo = steps.some((s) => ["cheap_pass", "deep_analysis", "message_writer"].includes(s.step) && s.status === "failed");
  const runFallo = run.status === "failed";
  const hayLeadsPendientes = leads.some((l) => l.messageStatus === "draft");
  const leadAbierto = leads.find((l) => l.companyId === leadAbiertoId) || null;

  // "Salida": los mensajes ya aprobados por revisión humana. En este MVP
  // nada se envía todavía, así que todos cuentan como "listos para enviar".
  const aprobados = leads.filter((l) => l.messageStatus === "approved");

  const sector = typeof run.input.sector === "string" ? run.input.sector : null;
  const ubicacion = typeof run.input.location === "string" ? run.input.location : null;
  const limite = typeof run.input.limit === "number" ? run.input.limit : null;

  const embudo = [
    { label: "Encontradas", valor: progreso.companiesFound },
    { label: "Candidatas", valor: progreso.companiesCandidate },
    { label: "Pase rápido", valor: progreso.companiesCheapPass },
    { label: "Calificadas", valor: progreso.companiesQualified },
  ];


  return (
    <div
      ref={canvasRef}
      className="relative h-full flex-1 overflow-hidden rounded-xl border bg-white"
      style={{
        // Dos capas de puntos, la segunda desplazada media celda en x e
        // y — así cada fila queda a la mitad respecto a la de arriba y
        // los puntos forman triángulos, no una cuadrícula cuadrada.
        backgroundImage:
          "radial-gradient(var(--border) 1px, transparent 1px), radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: "20px 20px, 20px 20px",
        backgroundPosition: "0 0, 10px 10px",
      }}
    >
      <button
        type="button"
        onClick={alternarAmpliado}
        title={ampliado ? "Restaurar" : "Ampliar"}
        className="absolute top-3 right-3 z-20 flex size-7 items-center justify-center rounded-[4px] border border-border bg-white text-muted-foreground shadow-sm hover:bg-muted"
      >
        {ampliado ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
      </button>

      {/* Conectores: Entrada→Agente, Agente→Herramientas (discovery),
          Agente→Embudo. Sobre el mismo viewBox 0-100 que el left/top de
          las columnas, con preserveAspectRatio="none". */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-border">
        <path d="M23,16 C 30,16 29,22 36,22" fill="none" stroke="currentColor" strokeDasharray="0.3 0.4" strokeWidth="0.18" />
        <path
          d="M36,27 C 30,27 29,37 23,37"
          fill="none"
          stroke={discoveryActivo ? "#3b82f6" : "currentColor"}
          strokeDasharray="0.3 0.4"
          strokeWidth="0.18"
        />
        <path
          d="M60,22 C 65,22 64,16 70,16"
          fill="none"
          stroke={pipelineActivo ? "#3b82f6" : "currentColor"}
          strokeDasharray="0.3 0.4"
          strokeWidth="0.18"
        />
        <Punto x={23} y={16} activo={false} />
        <Punto x={36} y={22} activo={false} />
        <Punto x={36} y={27} activo={discoveryActivo} />
        <Punto x={23} y={37} activo={discoveryActivo} />
        <Punto x={60} y={22} activo={pipelineActivo} />
        <Punto x={70} y={16} activo={pipelineActivo} />
      </svg>

      {/* Columna 1 — entrada y capacidades del agente */}
      <div className="absolute flex flex-col gap-4" style={{ left: "3%", width: "20%", top: "8%" }}>
      <Tarjeta titulo="Entrada">
        <div className="-mx-3 divide-y divide-border text-xs">
          <div className="flex h-8 items-center px-3"><span className="text-muted-foreground">Sector: </span>{sector || "—"}</div>
          <div className="flex h-8 items-center px-3"><span className="text-muted-foreground">Ubicación: </span>{ubicacion || "—"}</div>
          <div className="flex h-8 items-center px-3"><span className="text-muted-foreground">Límite: </span>{limite ?? "—"}</div>
        </div>
      </Tarjeta>

      <Tarjeta
        claseExterior={discoveryFallo ? ERROR_CLASE : undefined}
        titulo={
          <>
            <Global className="size-3.5" /> Herramientas
          </>
        }
      >
        <div className="-mx-3 divide-y divide-border text-xs">
          {HERRAMIENTAS.map((h) => (
            <div key={h.nombre} className="flex items-center gap-2 px-3 py-2">
              <FaviconApp dominio={h.dominio} alt={h.nombre} />
              <div className="min-w-0">
                <p className="truncate font-medium">{h.nombre}</p>
                <p className="truncate text-[10px] text-muted-foreground">{h.detalle}</p>
              </div>
              {discoveryFallo ? (
                <span className="ml-auto text-[10px] text-destructive">error</span>
              ) : (
                discoveryActivo && <span className="ml-auto size-1.5 shrink-0 animate-pulse rounded-full bg-blue-500" />
              )}
            </div>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta
        claseExterior={pipelineFallo ? ERROR_CLASE : undefined}
        titulo={
          <>
            <Sparkles className="size-3.5" /> Modelos
          </>
        }
      >
        <div className="-mx-3 divide-y divide-border text-xs">
          {MODELOS.map((m) => (
            <div key={m.nombre} className="flex items-center gap-2 px-3 py-2">
              <span className={`size-2 shrink-0 rounded-full ${m.dot}`} />
              <div className="min-w-0">
                <p className="truncate font-medium">{m.nombre}</p>
                <p className="truncate text-[10px] text-muted-foreground">{m.rol}</p>
              </div>
              {pipelineFallo ? (
                <span className="ml-auto text-[10px] text-destructive">error</span>
              ) : (
                pipelineActivo && <span className="ml-auto size-1.5 shrink-0 animate-pulse rounded-full bg-blue-500" />
              )}
            </div>
          ))}
        </div>
      </Tarjeta>
      </div>

      {/* Columna 2 — el agente, sus leads y el equipo */}
      <div className="absolute flex flex-col gap-4" style={{ left: "36%", width: "24%", top: "8%" }}>
      <Tarjeta claseExterior={runFallo ? ERROR_CLASE : undefined} titulo="Agente">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-teal-600 text-white">
            <Cpu className="size-3.5" />
          </span>
          <p className="truncate text-sm font-medium">{tipoLabel}</p>
        </div>
        <div className="mb-2 space-y-0.5">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Objetivo</p>
          <p className="line-clamp-2 text-xs">{run.goalText}</p>
        </div>
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>${run.totalCostUsd.toFixed(4)}</span>
          <span>{tokensCompacto(run.totalTokensInput + run.totalTokensOutput)} tokens</span>
        </div>
        <PillBadge bg={color.bg} color={color.color} className="text-[11px]">{ESTADO_RUN_LABEL[run.status]}</PillBadge>
      </Tarjeta>

      <Tarjeta
        claseExterior="border-dashed border-sky-300 bg-sky-50"
        titulo={
          <>
            <span className={`size-1.5 shrink-0 rounded-full ${hayLeadsPendientes ? "animate-pulse bg-blue-500" : "bg-muted-foreground/30"}`} />
            <UserCheck className="size-3.5" /> Leads
          </>
        }
      >
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin leads calificados todavía.</p>
        ) : (
          <div className="-mx-3 max-h-44 divide-y divide-border overflow-y-auto text-xs">
            {leads.map((lead) => (
              <div key={lead.companyId} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => abrirLead(lead)}
                  className="-my-1 min-w-0 flex-1 rounded-sm py-1 text-left hover:bg-black/3"
                >
                  <p className="truncate font-medium">{lead.name}</p>
                  <p className="text-muted-foreground">Score {lead.score ?? "—"}</p>
                </button>
                {lead.messageStatus === "draft" ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      title="Aprobar"
                      onClick={(e) => { e.stopPropagation(); revisar(lead, "approved"); }}
                      className="flex size-5 items-center justify-center rounded-sm border border-border text-emerald-600 hover:bg-emerald-50"
                    >
                      <Check className="size-3" />
                    </button>
                    <button
                      type="button"
                      title="Rechazar"
                      onClick={(e) => { e.stopPropagation(); revisar(lead, "rejected"); }}
                      className="flex size-5 items-center justify-center rounded-sm border border-border text-destructive hover:bg-destructive/10"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  lead.messageStatus && (
                    <PillBadge bg={ESTADO_MENSAJE_COLOR[lead.messageStatus].bg} color={ESTADO_MENSAJE_COLOR[lead.messageStatus].color} className="shrink-0 text-[10px]">
                      {ESTADO_MENSAJE_LABEL[lead.messageStatus]}
                    </PillBadge>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {eventos && (
        <Tarjeta
          titulo={
            <>
              <Cpu className="size-3.5" /> Equipo
            </>
          }
        >
          <div className="-mx-3 divide-y divide-border text-xs">
            {EQUIPO.map((a) => {
              const evs = eventos.filter((e) => e.agentSlug === a.slug);
              return (
                <div key={a.slug} className="flex items-center gap-2 px-3 py-1.5">
                  <span className={`size-1.5 shrink-0 rounded-full ${evs.length ? a.dot : "bg-muted-foreground/25"}`} />
                  <span className="min-w-0 flex-1 truncate">{a.label}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{evs.length ? a.contar(evs) : "—"}</span>
                </div>
              );
            })}
          </div>
        </Tarjeta>
      )}
      </div>

      {/* Columna 3 — resultado: embudo y salida */}
      <div className="absolute flex flex-col gap-4" style={{ left: "70%", width: "27%", top: "8%" }}>
      <Tarjeta
        claseExterior={pipelineFallo ? ERROR_CLASE : undefined}
        titulo={
          <>
            <span className={`size-1.5 shrink-0 rounded-full ${pipelineFallo ? "bg-destructive" : pipelineActivo ? "animate-pulse bg-blue-500" : "bg-muted-foreground/30"}`} />
            Embudo
          </>
        }
      >
        <div className="space-y-1 text-xs">
          {embudo.map((e) => (
            <div key={e.label} className="flex items-center justify-between">
              <span className="text-muted-foreground">{e.label}</span>
              <span className="font-medium tabular-nums">{e.valor ?? "—"}</span>
            </div>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta
        claseExterior="border-dashed border-orange-300 bg-orange-50"
        titulo={
          <>
            <span className={`size-1.5 shrink-0 rounded-full ${aprobados.length ? "animate-pulse bg-orange-500" : "bg-muted-foreground/30"}`} />
            <Send className="size-3.5" /> Salida
          </>
        }
      >
        {aprobados.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin mensajes aprobados todavía.</p>
        ) : (
          <div className="-mx-3 max-h-44 divide-y divide-border overflow-y-auto text-xs">
            {aprobados.map((lead) => (
              <button
                key={lead.companyId}
                type="button"
                onClick={() => abrirLead(lead)}
                className="block w-full px-3 py-1.5 text-left hover:bg-black/3"
              >
                <p className="truncate font-medium">{lead.name}</p>
                <p className="truncate text-muted-foreground">{lead.subject || "Sin asunto"}</p>
              </button>
            ))}
          </div>
        )}
      </Tarjeta>
      </div>

      {/* Lectura del run — solo coste / tokens / duración, sin contenedor.
          (Provisional en la esquina; se moverá arriba.) */}
      <div className="absolute right-3 bottom-3 z-20 flex flex-col items-end gap-1">
        <div className="flex items-stretch gap-4 text-center">
          <div>
            <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Coste</p>
            <p className="text-sm font-semibold tabular-nums">${run.totalCostUsd.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Tokens</p>
            <p
              className="text-sm font-semibold tabular-nums"
              title={`${run.totalTokensInput} entrada · ${run.totalTokensOutput} salida`}
            >
              {tokensCompacto(run.totalTokensInput + run.totalTokensOutput)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Duración</p>
            <p className="text-sm font-semibold tabular-nums">{formatearDuracion(duracionRunMs(run))}</p>
          </div>
        </div>
        {budget && budget.byResource.length > 0 && (
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {budget.byResource
              .map((b) => `${b.resource} $${Number(b.cost_usd).toFixed(4)}`)
              .join("  ·  ")}
          </p>
        )}
      </div>

      <Dialog open={leadAbierto !== null} onOpenChange={(o) => !o && setLeadAbiertoId(null)}>
        {leadAbierto && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{leadAbierto.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {[leadAbierto.sector, leadAbierto.location].filter(Boolean).join(" · ") || "Sin datos de sector/ubicación"}
              </p>
            </DialogHeader>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span><span className="text-muted-foreground">Score:</span> <b>{leadAbierto.score ?? "—"}</b></span>
                {leadAbierto.fit && (
                  <span><span className="text-muted-foreground">Fit:</span> <b>{leadAbierto.fit}</b></span>
                )}
                {leadAbierto.confidence !== null && (
                  <span><span className="text-muted-foreground">Confianza:</span> <b>{Math.round(leadAbierto.confidence * 100)}%</b></span>
                )}
                {leadAbierto.messageStatus && ESTADO_MENSAJE_COLOR[leadAbierto.messageStatus] && (
                  <PillBadge bg={ESTADO_MENSAJE_COLOR[leadAbierto.messageStatus].bg} color={ESTADO_MENSAJE_COLOR[leadAbierto.messageStatus].color} className="text-[10px]">
                    {ESTADO_MENSAJE_LABEL[leadAbierto.messageStatus]}
                  </PillBadge>
                )}
              </div>

              {(leadAbierto.offer && leadAbierto.offer !== "none") && (
                <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
                  <p className="font-medium text-sky-800">Oferta: {SERVICE_LABEL[leadAbierto.offer] ?? leadAbierto.offer}</p>
                  {leadAbierto.angle && <p className="mt-1">{leadAbierto.angle}</p>}
                  {leadAbierto.rationale && <p className="mt-1 text-muted-foreground">{leadAbierto.rationale}</p>}
                </div>
              )}

              {leadAbierto.reason && (
                <div>
                  <p className="font-medium text-muted-foreground">Calificación</p>
                  <p>{leadAbierto.reason}</p>
                </div>
              )}

              {(leadAbierto.briefOpportunities?.length ?? 0) > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Oportunidades</p>
                  <ul className="list-disc pl-4">
                    {leadAbierto.briefOpportunities!.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {(leadAbierto.riskList?.length ?? leadAbierto.painPoints.length) > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Riesgos / puntos de dolor</p>
                  <ul className="list-disc pl-4">
                    {(leadAbierto.riskList?.length ? leadAbierto.riskList : leadAbierto.painPoints).map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {leadAbierto.briefSummary && (
                <div>
                  <p className="font-medium text-muted-foreground">Research</p>
                  <p>{leadAbierto.briefSummary}</p>
                </div>
              )}

              {(leadAbierto.facts?.length ?? 0) > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Hechos verificados</p>
                  <ul className="list-disc pl-4">
                    {leadAbierto.facts!.map((f, i) => (
                      <li key={i}>
                        {f.statement}
                        {f.evidenceUrls?.length ? (
                          <span className="text-muted-foreground"> — {f.evidenceUrls.join(", ")}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(leadAbierto.inferences?.length ?? 0) > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Inferencias</p>
                  <ul className="list-disc pl-4">
                    {leadAbierto.inferences!.map((f, i) => (
                      <li key={i}>{f.statement}{f.confidence != null ? ` (conf. ${Math.round(f.confidence * 100)}%)` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(leadAbierto.evidence?.length ?? 0) > 0 && (
                <details>
                  <summary className="cursor-pointer font-medium text-muted-foreground select-none">Evidencia ({leadAbierto.evidence!.length})</summary>
                  <ul className="mt-1 space-y-1 border-l pl-3">
                    {leadAbierto.evidence!.map((e, i) => (
                      <li key={i}>
                        <span className="text-muted-foreground">[{e.type}] </span>
                        {e.statement || e.url}
                        {e.url && e.statement ? <span className="text-muted-foreground"> — {e.url}</span> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="rounded-md border bg-muted/40 p-3">
                <p className="font-medium text-muted-foreground">Mensaje en borrador{leadAbierto.channel ? ` · ${leadAbierto.channel}` : ""}</p>
                {leadAbierto.subject && <p className="mt-1 font-medium">{leadAbierto.subject}</p>}
                <p className="mt-1 whitespace-pre-wrap">{leadAbierto.message || "Sin mensaje redactado."}</p>
              </div>
            </div>

            {leadAbierto.messageStatus === "draft" && (
              <DialogFooter>
                <Button variant="outline" onClick={() => revisarYCerrar(leadAbierto, "rejected")}>
                  <X className="size-4" /> Rechazar
                </Button>
                <Button onClick={() => revisarYCerrar(leadAbierto, "approved")}>
                  <Check className="size-4" /> Aprobar
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
