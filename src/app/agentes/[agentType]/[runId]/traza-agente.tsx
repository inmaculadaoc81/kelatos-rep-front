"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, CircleX, Square, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PillBadge } from "@/components/pill-badge";
import { useConfirm } from "@/components/confirm-provider";
import { AgentRun, AgentStep, ESTADO_RUN_LABEL } from "@/lib/agentes";
import type { AgentEvent, CampaignPlan } from "@/lib/campanas";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";

// Traza del run con los componentes reales de shadcn/ai-elements. La
// mayoría de los pasos usan el punto por defecto de ChainOfThoughtStep
// (mismo lenguaje visual que un paso de "pensamiento" genérico) — solo
// "discovery" tiene icono propio y, además, sus resultados reales como
// chips (ChainOfThoughtSearchResults), igual que un paso "Searched"
// muestra las fuentes que encontró. Nada de favicons de plataforma en
// los demás pasos: no se "conectan" a un sitio con marca reconocible,
// son código propio o llamadas a OpenAI.
// Encierra cualquier icono en una cajita con borde de 1px — mismo icono
// de siempre, pequeño y gris oscuro, casi sin padding. ChainOfThoughtStep
// solo hace `<Icon className="size-4" />`, así que ese className cae en
// el envoltorio (la caja) y el icono real se dibuja más chico adentro.
// Se llama SOLO a nivel de módulo (nunca dentro del render) para no
// crear un componente nuevo en cada pasada — el mismo problema que tenía
// shimmer.tsx con motion.create() antes de cachearlo.
function conCaja(IconoInterno: LucideIcon): LucideIcon {
  function IconoEnCaja({ className }: { className?: string }) {
    return (
      <span className={`${className || ""} flex items-center justify-center rounded-sm border border-border`}>
        <IconoInterno className="size-3 text-muted-foreground" strokeWidth={2} />
      </span>
    );
  }
  return IconoEnCaja as unknown as LucideIcon;
}

const ICONO_BUSQUEDA = conCaja(Search);
const ICONO_FALLO = conCaja(CircleX);

const PASO_INFO: Record<string, { label: string; subtitulo?: string; icon?: LucideIcon }> = {
  // agente lead_research (clásico)
  discovery: { label: "Búsqueda de empresas", subtitulo: "infoisinfo.es", icon: ICONO_BUSQUEDA },
  dedupe_filter: { label: "Filtro y deduplicación", subtitulo: "Código determinista" },
  cheap_pass: { label: "Puntuación rápida", subtitulo: "Modelo económico" },
  deep_analysis: { label: "Análisis profundo", subtitulo: "Modelo avanzado" },
  message_writer: { label: "Redacción de mensaje", subtitulo: "Modelo avanzado" },
  // pipeline de campaña (equipo de marketing)
  campaign_planner: { label: "Plan de campaña", subtitulo: "ICP y señales" },
  enrich: { label: "Enriquecimiento", subtitulo: "Web + scraping" },
  heuristic_rank: { label: "Ranking heurístico", subtitulo: "Código determinista" },
  batch_classify: { label: "Clasificación en lote", subtitulo: "Modelo económico" },
  web_research: { label: "Web Research", subtitulo: "Agente · modelo medio" },
  qualification: { label: "Calificación", subtitulo: "Fit comercial" },
  offer_strategy: { label: "Estrategia de oferta", subtitulo: "Qué servicio ofrecer" },
  outreach: { label: "Borradores de contacto", subtitulo: "Modelo medio" },
  marketing_manager: { label: "Marketing Manager", subtitulo: "Supervisión" },
};

const MAX_CHIPS_VISIBLES = 4;

// Pasos cuyo detalle por empresa se puede desplegar (cada fila de
// agent_steps es una empresa, y su output trae score/calificado/motivo).
const PASOS_CON_DETALLE = new Set(["cheap_pass", "deep_analysis", "message_writer"]);

interface GrupoPaso {
  step: string;
  label: string;
  subtitulo: string;
  icon: LucideIcon | undefined;
  cantidad: number;
  estado: "completed" | "running" | "failed";
  pasos: AgentStep[];
  duracionMs: number;
}

function agruparPasos(steps: AgentStep[]): GrupoPaso[] {
  const orden: string[] = [];
  const mapa = new Map<string, AgentStep[]>();
  for (const s of steps) {
    if (!mapa.has(s.step)) {
      mapa.set(s.step, []);
      orden.push(s.step);
    }
    mapa.get(s.step)!.push(s);
  }
  return orden.map((step) => {
    const lista = mapa.get(step)!;
    const estado: GrupoPaso["estado"] = lista.some((s) => s.status === "failed")
      ? "failed"
      : lista.some((s) => s.status === "running")
        ? "running"
        : "completed";
    const info = PASO_INFO[step];
    const duracionMs = lista.reduce((n, s) => n + (s.durationMs || 0), 0);
    return { step, label: info?.label || step, subtitulo: info?.subtitulo || "", icon: info?.icon, cantidad: lista.length, estado, pasos: lista, duracionMs };
  });
}

/** companyId -> nombre, sacado del output del paso dedupe_filter (que
    devuelve la lista de candidatas con {id, name, ...}) — es la única
    fuente en el frontend que enlaza el id de empresa con su nombre para
    los pasos por empresa (cheap_pass/deep_analysis/message_writer). */
function nombresDeCandidatas(steps: AgentStep[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const s of steps) {
    if (s.step !== "dedupe_filter" || !Array.isArray(s.output)) continue;
    for (const e of s.output as Array<{ id?: number | string; name?: string }>) {
      const id = e?.id != null ? Number(e.id) : NaN;
      if (!Number.isNaN(id) && e?.name) m.set(id, e.name);
    }
  }
  return m;
}

function formatearDuracion(ms: number): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

/** Una fila del detalle por empresa dentro de un paso desplegado. */
function filaEmpresa(s: AgentStep, nombre: string) {
  if (s.status === "failed") {
    return <li key={s.id} className="truncate text-destructive">{nombre} — {s.error || "falló"}</li>;
  }
  if (s.status === "running") {
    return <li key={s.id} className="truncate text-muted-foreground">{nombre} — …</li>;
  }
  const o = (s.output ?? null) as Record<string, unknown> | null;

  if (s.step === "cheap_pass") {
    const score = Number((o as { score?: number })?.score ?? 0);
    const pasa = (o as { pasa?: boolean })?.pasa === true;
    return (
      <li key={s.id} className="flex items-center justify-between gap-2">
        <span className="truncate">{nombre}</span>
        <span className="shrink-0 tabular-nums">
          <b>{score}</b> <span className={pasa ? "text-emerald-600" : "text-muted-foreground"}>{pasa ? "✓" : "✗"}</span>
        </span>
      </li>
    );
  }

  if (s.step === "deep_analysis") {
    const analisis = (o as { analisis?: { score?: number; reason?: string } })?.analisis;
    const calificado = (o as { calificado?: boolean })?.calificado === true;
    const score = Number(analisis?.score ?? 0);
    return (
      <li key={s.id}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{nombre}</span>
          <span className="shrink-0 tabular-nums">
            <b>{score}</b> <span className={calificado ? "text-emerald-600" : "text-muted-foreground"}>{calificado ? "✓ calificada" : "✗"}</span>
          </span>
        </div>
        {analisis?.reason && <p className="text-muted-foreground">{analisis.reason}</p>}
      </li>
    );
  }

  if (s.step === "message_writer") {
    return <li key={s.id} className="truncate">{nombre} — borrador redactado</li>;
  }

  return <li key={s.id} className="truncate">{nombre}</li>;
}

/** Empresas encontradas por el paso discovery más reciente, para
    mostrarlas como chips (el output de ese paso es el array real que
    devolvió findBusinesses). */
function empresasEncontradas(steps: AgentStep[]): string[] {
  const paso = [...steps].reverse().find((s) => s.step === "discovery" && s.status === "completed");
  if (!paso || !Array.isArray(paso.output)) return [];
  return (paso.output as Array<{ name?: string }>).map((e) => e.name).filter((n): n is string => !!n);
}

function tiempoEnSegundos(run: AgentRun): number {
  if (!run.startedAt) return 0;
  const fin = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  return Math.max(0, Math.round((fin - new Date(run.startedAt).getTime()) / 1000));
}

function tokensCompacto(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function tiempoRelativo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "justo ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `hace ${diffD} día${diffD !== 1 ? "s" : ""}`;
}

/** Último razonamiento real disponible (analysis.reason del paso
    deep_analysis más reciente completado) — no hay stream de tokens en
    vivo todavía, así que esto es lo más cercano a "en qué está pensando"
    que se puede mostrar sin inventar nada. */
function ultimoRazonamiento(steps: AgentStep[]): string | null {
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    if (s.step !== "deep_analysis" || s.status !== "completed" || !s.output) continue;
    const analisis = (s.output as { analisis?: { reason?: string } })?.analisis;
    if (analisis?.reason) return analisis.reason;
  }
  return null;
}

/** En campañas no hay pasos deep_analysis; el "razonamiento" más cercano
    es el último resumen de una decisión del equipo (manager, calificación,
    research u oferta). */
function ultimoRazonamientoEventos(eventos: AgentEvent[]): string | null {
  const relevantes = new Set(["marketing_manager", "qualification", "offer_strategy", "web_research", "campaign_planner"]);
  for (let i = eventos.length - 1; i >= 0; i--) {
    const ev = eventos[i];
    if (relevantes.has(ev.agentSlug) && ev.summary) {
      return ev.companyName ? `${ev.companyName}: ${ev.summary}` : ev.summary;
    }
  }
  return null;
}

// Color de punto por agente del equipo (timeline de campaña).
const COLOR_AGENTE: Record<string, string> = {
  orchestrator: "bg-muted-foreground/40",
  campaign_planner: "bg-violet-500",
  marketing_manager: "bg-amber-500",
  web_research: "bg-cyan-600",
  qualification: "bg-emerald-500",
  offer_strategy: "bg-blue-500",
  outreach: "bg-orange-500",
};

const LABEL_AGENTE: Record<string, string> = {
  orchestrator: "Orquestador",
  campaign_planner: "Campaign Planner",
  marketing_manager: "Marketing Manager",
  web_research: "Web Research",
  qualification: "Qualification",
  offer_strategy: "Offer Strategist",
  outreach: "Outreach",
};

export function TrazaAgente({
  run,
  steps,
  tipoLabel,
  agentType,
  onActualizado,
  eventos,
  plan,
}: {
  run: AgentRun;
  steps: AgentStep[];
  tipoLabel: string;
  agentType: string;
  onActualizado: () => void;
  /** Cuando se pasa (campañas), la "Actividad" es el timeline del equipo
      en vez de los grupos de agent_steps. */
  eventos?: AgentEvent[];
  /** Plan del Campaign Planner (ICP, señales, propuesta, target). */
  plan?: CampaignPlan | null;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [enviando, setEnviando] = useState(false);

  const grupos = agruparPasos(steps);
  const tokensTotal = run.totalTokensInput + run.totalTokensOutput;
  const razonamiento = ultimoRazonamiento(steps) ?? (eventos ? ultimoRazonamientoEventos(eventos) : null);
  const enCurso = run.status === "queued" || run.status === "running";
  const empresas = empresasEncontradas(steps);
  const empresasVisibles = empresas.slice(0, MAX_CHIPS_VISIBLES);
  const empresasRestantes = empresas.length - empresasVisibles.length;

  const nombres = nombresDeCandidatas(steps);
  const prog = run.progress as Record<string, number | undefined>;

  async function cancelar() {
    const ok = await confirmar("¿Detener este run? Los pasos que ya se completaron quedan como están, pero no se harán más llamadas al modelo.", { titulo: "Detener run" });
    if (!ok) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/agentes/runs/${run.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Run detenido");
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function reintentar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/agentes/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, goal: run.goalText, input: run.input }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Nuevo run creado");
      router.push(`/agentes/${agentType}/${data.runId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="h-full w-full max-w-110 shrink-0 space-y-4 overflow-y-auto rounded-xl bg-white p-4 text-sm">
      <div>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-2xl border border-border bg-white px-3 py-2">
          <p className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium">Run</span>
            <PillBadge bg="#e8edfc" color="#2451c4" className="text-[11px] font-normal">{tipoLabel}</PillBadge>
            <span className="text-muted-foreground">{ESTADO_RUN_LABEL[run.status]} · {tiempoRelativo(run.createdAt)}</span>
          </p>
          {enCurso ? (
            <button
              type="button"
              onClick={cancelar}
              disabled={enviando}
              title="Detener run"
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background hover:opacity-90 disabled:opacity-50"
            >
              <Square className="size-2.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={reintentar}
              disabled={enviando}
              title="Relanzar con el mismo objetivo"
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-50"
            >
              <RotateCcw className="size-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-xs text-muted-foreground" title={run.goalText}>{run.goalText}</p>
      </div>

      {plan && (
        <details className="rounded-lg border border-border" open>
          <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium select-none marker:content-['']">
            <span className="text-muted-foreground">›</span>
            Plan de campaña
            {plan.targetLeads ? <span className="text-muted-foreground">· objetivo {plan.targetLeads} leads</span> : null}
          </summary>
          <div className="space-y-2.5 border-t border-border px-3 py-2.5 text-xs">
            {plan.icp && (
              <div>
                <p className="font-medium text-muted-foreground">Cliente ideal (ICP)</p>
                <p>{plan.icp}</p>
              </div>
            )}
            {plan.valueProposition && (
              <div>
                <p className="font-medium text-muted-foreground">Propuesta de valor</p>
                <p>{plan.valueProposition}</p>
              </div>
            )}
            {(plan.sectors?.length > 0 || plan.locations?.length > 0) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {plan.sectors?.length > 0 && (
                  <p><span className="text-muted-foreground">Sectores: </span>{plan.sectors.join(", ")}</p>
                )}
                {plan.locations?.length > 0 && (
                  <p><span className="text-muted-foreground">Zonas: </span>{plan.locations.join(", ")}</p>
                )}
              </div>
            )}
            {plan.positiveSignals?.length > 0 && (
              <div>
                <p className="font-medium text-emerald-600">Señales a favor</p>
                <ul className="list-disc pl-4">
                  {plan.positiveSignals.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {plan.negativeSignals?.length > 0 && (
              <div>
                <p className="font-medium text-destructive">Señales en contra</p>
                <ul className="list-disc pl-4">
                  {plan.negativeSignals.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {plan.channels?.length > 0 && (
              <p><span className="text-muted-foreground">Canales: </span>{plan.channels.join(", ")}</p>
            )}
          </div>
        </details>
      )}

      <ChainOfThought defaultOpen>
        <ChainOfThoughtHeader>Actividad</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
        {grupos.map((g) => {
          const fallo = g.estado === "failed";
          return (
            <ChainOfThoughtStep
              key={g.step}
              icon={fallo ? ICONO_FALLO : g.icon}
              status={g.estado === "running" ? "active" : "complete"}
              className={fallo ? "text-destructive" : undefined}
              label={g.label}
              description={`${g.subtitulo}${g.cantidad > 1 ? ` · ${g.cantidad}` : ""}${g.duracionMs ? ` · ${formatearDuracion(g.duracionMs)}` : ""}`}
            >
              {g.step === "discovery" && empresasVisibles.length > 0 && (
                <ChainOfThoughtSearchResults>
                  {empresasVisibles.map((nombre, i) => (
                    <ChainOfThoughtSearchResult key={i}>{nombre}</ChainOfThoughtSearchResult>
                  ))}
                  {empresasRestantes > 0 && (
                    <ChainOfThoughtSearchResult>+{empresasRestantes} más</ChainOfThoughtSearchResult>
                  )}
                </ChainOfThoughtSearchResults>
              )}

              {g.step === "dedupe_filter" && empresas.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {prog.companiesCandidate ?? "—"} candidata{prog.companiesCandidate === 1 ? "" : "s"} de {empresas.length} encontradas
                </p>
              )}

              {PASOS_CON_DETALLE.has(g.step) && g.pasos.length > 0 && (
                <details className="text-xs" open={g.estado === "running"}>
                  <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
                    Ver {g.pasos.length} {g.pasos.length === 1 ? "empresa" : "empresas"}
                  </summary>
                  <ul className="mt-1 space-y-1 border-l border-border pl-2">
                    {g.pasos.map((s) =>
                      filaEmpresa(s, s.companyId != null ? (nombres.get(s.companyId) ?? `Empresa ${s.companyId}`) : "—")
                    )}
                  </ul>
                </details>
              )}
            </ChainOfThoughtStep>
          );
        })}
        {grupos.length === 0 && <p className="text-xs text-muted-foreground">Sin actividad todavía.</p>}
        </ChainOfThoughtContent>
      </ChainOfThought>

      {eventos && eventos.length > 0 && (() => {
        const porAgente = new Map<string, AgentEvent[]>();
        for (const ev of eventos) {
          if (ev.agentSlug === "orchestrator") continue; // los pasos ya están en "Actividad"
          if (!porAgente.has(ev.agentSlug)) porAgente.set(ev.agentSlug, []);
          porAgente.get(ev.agentSlug)!.push(ev);
        }
        const agentes = [...porAgente.entries()];
        if (agentes.length === 0) return null;
        return (
          <details className="rounded-lg border border-border">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium select-none marker:content-['']">
              <span className="text-muted-foreground">›</span>
              Sub-agentes <span className="text-muted-foreground">· {agentes.length} agente{agentes.length !== 1 ? "s" : ""}</span>
            </summary>
            <div className="space-y-2 border-t border-border px-3 py-2">
              {agentes.map(([slug, evs]) => (
                <details key={slug} className="text-xs">
                  <summary className="flex cursor-pointer items-center gap-2 select-none marker:content-['']">
                    <span className={`size-1.5 shrink-0 rounded-full ${COLOR_AGENTE[slug] ?? "bg-muted-foreground/40"}`} />
                    <span className="font-medium">{LABEL_AGENTE[slug] ?? slug}</span>
                    <span className="text-muted-foreground">· {evs.length}</span>
                  </summary>
                  <ul className="mt-1 space-y-1.5 border-l border-border pl-3">
                    {evs.map((ev) => (
                      <li key={ev.id}>
                        <span className="text-muted-foreground">{ev.action}{ev.companyName ? ` · ${ev.companyName}` : ""}: </span>
                        {ev.summary}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </details>
        );
      })()}

      {run.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{run.error}</p>
      )}

      <Reasoning isStreaming={enCurso} duration={tiempoEnSegundos(run)} className="border-t pt-3">
        <ReasoningTrigger
          getThinkingMessage={(streaming, duration) => (
            <span className={streaming ? "text-shimmer" : ""}>
              {streaming ? "Pensando" : `Pensó durante ${duration ?? 0}s`} · {tokensCompacto(tokensTotal)} tokens
            </span>
          )}
        />
        <ReasoningContent>{razonamiento || "Todavía sin razonamiento disponible."}</ReasoningContent>
      </Reasoning>
    </div>
  );
}
