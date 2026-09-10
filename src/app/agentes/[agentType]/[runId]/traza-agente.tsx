"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, CircleX, Square, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PillBadge } from "@/components/pill-badge";
import { useConfirm } from "@/components/confirm-provider";
import { AgentRun, AgentStep, ESTADO_RUN_LABEL } from "@/lib/agentes";
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
  discovery: { label: "Búsqueda de empresas", subtitulo: "infoisinfo.es", icon: ICONO_BUSQUEDA },
  dedupe_filter: { label: "Filtro y deduplicación", subtitulo: "Código determinista" },
  cheap_pass: { label: "Puntuación rápida", subtitulo: "Modelo económico" },
  deep_analysis: { label: "Análisis profundo", subtitulo: "Modelo avanzado" },
  message_writer: { label: "Redacción de mensaje", subtitulo: "Modelo avanzado" },
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

function duracionRunMs(run: AgentRun): number {
  if (!run.startedAt) return 0;
  const fin = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  return Math.max(0, fin - new Date(run.startedAt).getTime());
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

export function TrazaAgente({
  run,
  steps,
  tipoLabel,
  agentType,
  onActualizado,
}: {
  run: AgentRun;
  steps: AgentStep[];
  tipoLabel: string;
  agentType: string;
  onActualizado: () => void;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [enviando, setEnviando] = useState(false);

  const grupos = agruparPasos(steps);
  const tokensTotal = run.totalTokensInput + run.totalTokensOutput;
  const razonamiento = ultimoRazonamiento(steps);
  const enCurso = run.status === "queued" || run.status === "running";
  const empresas = empresasEncontradas(steps);
  const empresasVisibles = empresas.slice(0, MAX_CHIPS_VISIBLES);
  const empresasRestantes = empresas.length - empresasVisibles.length;

  const nombres = nombresDeCandidatas(steps);
  const duracionTotalMs = duracionRunMs(run);
  const prog = run.progress as Record<string, number | undefined>;
  const embudo: Array<[string, number | undefined]> = [
    ["Encontradas", prog.companiesFound],
    ["Candidatas", prog.companiesCandidate],
    ["Pase rápido", prog.companiesCheapPass],
    ["Calificadas", prog.companiesQualified],
  ];

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

      <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-muted-foreground">Coste</p>
            <p className="font-medium tabular-nums">${run.totalCostUsd.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tokens</p>
            <p className="font-medium tabular-nums" title={`${run.totalTokensInput} entrada · ${run.totalTokensOutput} salida`}>
              {tokensCompacto(tokensTotal)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Duración</p>
            <p className="font-medium tabular-nums">{formatearDuracion(duracionTotalMs)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-border pt-2 text-muted-foreground">
          {embudo.map(([label, val], i) => (
            <span key={label} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/50">→</span>}
              <span>
                {label} <b className={`tabular-nums ${i === embudo.length - 1 ? "text-foreground" : ""}`}>{val ?? "—"}</b>
              </span>
            </span>
          ))}
        </div>
      </div>

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
