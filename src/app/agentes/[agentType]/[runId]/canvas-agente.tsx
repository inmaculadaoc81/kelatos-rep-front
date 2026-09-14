"use client";

import { useEffect, useRef, useState } from "react";
import {
  UserCheck, Check, X, Maximize2, Minimize2, Send, Sparkles,
  Briefcase, MapPin, Hash, Search, Filter, Zap, BadgeCheck, Building2, Mail,
  ClipboardList, Megaphone, Lightbulb, Users, BrainCircuit, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Global, Cpu, Refresh2 } from "@/lib/icons";
import { AgentLead, AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import type { AgentEvent, CampaignLead, CampaignBudget } from "@/lib/campanas";
import { SERVICE_LABEL, mapearLead } from "@/lib/campanas";
import {
  ERROR_CLASE, tokensCompacto, duracionRunMs, formatearDuracion,
  FaviconApp, IconoCaja, PuntoConector, curvaConector, Tarjeta,
} from "./canvas-shared";

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

/** Los dos niveles de modelo del embudo de coste. Son los valores por
    defecto de AGENTES_OPENAI_MODEL_CHEAP/DEEP en el backend (mismo criterio
    que HERRAMIENTAS: se muestran fijos, no hay endpoint de config todavía). */
const MODELOS = [
  { nombre: "gpt-4o-mini", rol: "Filtro barato · todas las candidatas" },
  { nombre: "gpt-4o", rol: "Análisis profundo y redacción" },
];

// Sub-agentes del equipo de marketing, en el orden del pipeline.
const EQUIPO: { slug: string; label: string; icon: LucideIcon; tint: string; contar: (e: AgentEvent[]) => string }[] = [
  { slug: "campaign_planner", label: "Campaign Planner", icon: ClipboardList, tint: "text-violet-500",
    contar: (e) => (e.some((x) => x.action === "plan_ready") ? "plan listo" : "—") },
  { slug: "marketing_manager", label: "Marketing Manager", icon: Megaphone, tint: "text-amber-500",
    contar: (e) => `${e.length} decisión${e.length !== 1 ? "es" : ""}` },
  { slug: "web_research", label: "Web Research", icon: Search, tint: "text-cyan-600",
    contar: (e) => `${e.filter((x) => x.action === "brief_ready").length} briefs` },
  { slug: "qualification", label: "Qualification", icon: BadgeCheck, tint: "text-emerald-500",
    contar: (e) => `${e.filter((x) => x.action === "qualified").length} calificados` },
  { slug: "offer_strategy", label: "Offer Strategist", icon: Lightbulb, tint: "text-blue-500",
    contar: (e) => `${e.filter((x) => x.action === "chose_offer").length} ofertas` },
  { slug: "linkedin_intelligence", label: "LinkedIn Discovery", icon: Users, tint: "text-sky-500",
    contar: (e) => `${e.filter((x) => x.action === "contacts_found").length} empresas con contactos` },
  { slug: "linkedin_contact_analysis", label: "LinkedIn Analysis", icon: BrainCircuit, tint: "text-fuchsia-500",
    contar: (e) => `${e.filter((x) => x.action === "contact_qualified").length} contactos calificados` },
  { slug: "linkedin_message_strategy", label: "LinkedIn Outreach", icon: MessageSquare, tint: "text-pink-500",
    contar: (e) => `${e.filter((x) => x.action === "linkedin_draft_ready").length} borradores` },
  { slug: "outreach", label: "Outreach", icon: Send, tint: "text-orange-500",
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

  // Conectores: en vez de coordenadas adivinadas a mano, se miden de
  // verdad el centro vertical (getBoundingClientRect) de cada tarjeta
  // implicada — así el punto de conexión cae siempre en el centro real de
  // ese lado, y si dos líneas llegan al mismo lado de una tarjeta
  // (Entrada Y Herramientas hacia Agente) confluyen en el MISMO punto, no
  // en dos puntos distintos. Se remide al montar y cada vez que cambia el
  // tamaño del canvas (incluida la pantalla completa).
  const entradaRef = useRef<HTMLDivElement>(null);
  const herramientasRef = useRef<HTMLDivElement>(null);
  const agenteRef = useRef<HTMLDivElement>(null);
  const embudoRef = useRef<HTMLDivElement>(null);

  type PuntoXY = { x: number; y: number };
  const [conectores, setConectores] = useState<{
    entrada: PuntoXY;
    herramientas: PuntoXY;
    agenteIzq: PuntoXY;
    agenteDer: PuntoXY;
    embudo: PuntoXY;
  } | null>(null);

  useEffect(() => {
    function medir(el: HTMLElement | null, cont: HTMLElement, lado: "izq" | "der"): PuntoXY | null {
      if (!el || !cont.clientWidth || !cont.clientHeight) return null;
      const c = cont.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {
        x: (((lado === "izq" ? r.left : r.right) - c.left) / c.width) * 100,
        y: ((r.top + r.height / 2 - c.top) / c.height) * 100,
      };
    }
    function recalcular() {
      const cont = canvasRef.current;
      if (!cont) return;
      const entrada = medir(entradaRef.current, cont, "der");
      const herramientas = medir(herramientasRef.current, cont, "der");
      const agenteIzq = medir(agenteRef.current, cont, "izq");
      const agenteDer = medir(agenteRef.current, cont, "der");
      const embudo = medir(embudoRef.current, cont, "izq");
      if (entrada && herramientas && agenteIzq && agenteDer && embudo) {
        setConectores({ entrada, herramientas, agenteIzq, agenteDer, embudo });
      }
    }
    recalcular();
    const ro = new ResizeObserver(recalcular);
    if (canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener("resize", recalcular);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalcular);
    };
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

  const discoveryActivo = steps.some((s) => s.step === "discovery" && s.status === "running");
  const pipelineActivo = steps.some((s) => ["cheap_pass", "deep_analysis", "message_writer"].includes(s.step) && s.status === "running");
  const discoveryFallo = steps.some((s) => s.step === "discovery" && s.status === "failed");
  const pipelineFallo = steps.some((s) => ["cheap_pass", "deep_analysis", "message_writer"].includes(s.step) && s.status === "failed");
  const runFallo = run.status === "failed";
  const enCurso = run.status === "queued" || run.status === "running";
  const hayLeadsPendientes = leads.some((l) => l.messageStatus === "draft");

  // "Salida": los mensajes ya aprobados por revisión humana. En este MVP
  // nada se envía todavía, así que todos cuentan como "listos para enviar".
  const aprobados = leads.filter((l) => l.messageStatus === "approved");

  const sector = typeof run.input.sector === "string" ? run.input.sector : null;
  const ubicacion = typeof run.input.location === "string" ? run.input.location : null;
  const limite = typeof run.input.limit === "number" ? run.input.limit : null;

  const embudo: { label: string; valor: number | undefined; icon: LucideIcon }[] = [
    { label: "Encontradas", valor: progreso.companiesFound, icon: Search },
    { label: "Candidatas", valor: progreso.companiesCandidate, icon: Filter },
    { label: "Pase rápido", valor: progreso.companiesCheapPass, icon: Zap },
    { label: "Calificadas", valor: progreso.companiesQualified, icon: BadgeCheck },
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

      {/* Conectores: Entrada→Agente y Herramientas→Agente (discovery) en
          morado, confluyendo en el MISMO punto del lado izquierdo de
          Agente; Agente→Embudo en verde. Puntos medidos de verdad (ver
          el useEffect de arriba), no adivinados. */}
      {conectores && (() => {
        const colorIzq = discoveryActivo ? "#3b82f6" : "#8b5cf6";
        const colorDer = pipelineActivo ? "#3b82f6" : "#10b981";
        return (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <path d={curvaConector(conectores.entrada, conectores.agenteIzq)} fill="none" stroke={colorIzq} strokeDasharray="0.3 0.4" strokeWidth="0.18" />
              <path d={curvaConector(conectores.herramientas, conectores.agenteIzq)} fill="none" stroke={colorIzq} strokeDasharray="0.3 0.4" strokeWidth="0.18" />
              <path d={curvaConector(conectores.agenteDer, conectores.embudo)} fill="none" stroke={colorDer} strokeDasharray="0.3 0.4" strokeWidth="0.18" />
            </svg>
            <PuntoConector x={conectores.entrada.x} y={conectores.entrada.y} color={colorIzq} />
            <PuntoConector x={conectores.herramientas.x} y={conectores.herramientas.y} color={colorIzq} />
            <PuntoConector x={conectores.agenteIzq.x} y={conectores.agenteIzq.y} color={colorIzq} />
            <PuntoConector x={conectores.agenteDer.x} y={conectores.agenteDer.y} color={colorDer} />
            <PuntoConector x={conectores.embudo.x} y={conectores.embudo.y} color={colorDer} />
          </>
        );
      })()}

      {/* Columna 1 — entrada y capacidades del agente */}
      <div className="absolute flex flex-col gap-4" style={{ left: "3%", width: "20%", top: "8%" }}>
      <Tarjeta ref={entradaRef} titulo="Entrada">
        <div className="-mx-3 divide-y divide-border text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <IconoCaja icon={Briefcase} />
            <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Sector</p><p className="truncate font-medium">{sector || "—"}</p></div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <IconoCaja icon={MapPin} />
            <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Ubicación</p><p className="truncate font-medium">{ubicacion || "—"}</p></div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <IconoCaja icon={Hash} />
            <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Límite</p><p className="truncate font-medium">{limite ?? "—"}</p></div>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta
        ref={herramientasRef}
        claseExterior={discoveryFallo ? ERROR_CLASE : "border-violet-200 bg-violet-50/60"}
        titulo={
          <span className="flex items-center gap-1.5 text-violet-700">
            <Global className="size-3.5" /> Herramientas
          </span>
        }
      >
        <div className="-mx-3 divide-y divide-border text-xs">
          {HERRAMIENTAS.map((h) => (
            <div key={h.nombre} className="flex items-center gap-2 px-3 py-1.5">
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
        claseExterior={pipelineFallo ? ERROR_CLASE : "border-emerald-200 bg-emerald-50/60"}
        titulo={
          <span className="flex items-center gap-1.5 text-emerald-700">
            <Sparkles className="size-3.5" /> Modelos
          </span>
        }
      >
        <div className="-mx-3 divide-y divide-border text-xs">
          {MODELOS.map((m) => (
            <div key={m.nombre} className="flex items-center gap-2 px-3 py-1.5">
              <FaviconApp dominio="openai.com" alt="OpenAI" />
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
      <Tarjeta ref={agenteRef} claseExterior={runFallo ? ERROR_CLASE : undefined} titulo="Agente">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-teal-600 text-white">
            {enCurso ? <Refresh2 className="size-3.5 animate-spin" /> : <Cpu className="size-3.5" />}
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
                {/* El detalle por lead vive en la tabla debajo del canvas
                    (campaign-leads-table.tsx) -- aquí solo un resumen de
                    lectura, sin clic (el modal que abría desde dentro del
                    canvas dejó de responder sin error visible, bug real
                    reportado 2026-09-14). */}
                <div className="-my-1 flex min-w-0 flex-1 items-center gap-2 py-1">
                  <IconoCaja icon={Building2} />
                  <span className="min-w-0">
                    <p className="truncate font-medium">{lead.name}</p>
                    <p className="text-muted-foreground">Score {lead.score ?? "—"}</p>
                  </span>
                </div>
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
                  <IconoCaja icon={a.icon} tint={evs.length ? a.tint : undefined} />
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
      <div className="absolute flex flex-col gap-4" style={{ left: "70%", width: "20%", top: "8%" }}>
      <Tarjeta
        ref={embudoRef}
        claseExterior={pipelineFallo ? ERROR_CLASE : undefined}
        titulo={
          <>
            <span className={`size-1.5 shrink-0 rounded-full ${pipelineFallo ? "bg-destructive" : pipelineActivo ? "animate-pulse bg-blue-500" : "bg-muted-foreground/30"}`} />
            Embudo
          </>
        }
      >
        <div className="-mx-3 divide-y divide-border text-xs">
          {embudo.map((e) => (
            <div key={e.label} className="flex items-center gap-2 px-3 py-1.5">
              <IconoCaja icon={e.icon} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{e.valor ?? "—"}</span>
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
              <div key={lead.companyId} className="flex items-center gap-2 px-3 py-1.5">
                <IconoCaja icon={Mail} />
                <span className="min-w-0">
                  <p className="truncate font-medium">{lead.name}</p>
                  <p className="truncate text-muted-foreground">{lead.subject || "Sin asunto"}</p>
                </span>
              </div>
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
    </div>
  );
}
