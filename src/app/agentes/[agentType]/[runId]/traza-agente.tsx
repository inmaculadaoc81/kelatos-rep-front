"use client";

import Link from "next/link";
import { Search, Filter, Zap, ScanSearch, Mail, CircleX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft2 } from "@/lib/icons";
import { PillBadge } from "@/components/pill-badge";
import { AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";

// Traza del run con los componentes reales de shadcn/ai-elements
// (npx shadcn add https://elements.ai-sdk.dev/api/registry/*.json) en
// vez de una línea de tiempo y un bloque de razonamiento hechos a mano:
// ChainOfThought para los pasos (icono + línea conectora ya la trae el
// propio componente) y Reasoning para "en qué está pensando" (abre solo
// mientras isStreaming, cierra solo, calcula la duración él mismo — no
// hay que llevar ese estado a mano). reasoning.tsx se simplificó para
// quitarle los plugins de markdown (cjk/code/math/mermaid) que trae de
// fábrica: nuestro texto es prosa simple del modelo, nunca código ni
// fórmulas, así que esos 4 paquetes no aportaban nada aquí.
const PASO_INFO: Record<string, { label: string; subtitulo: string; icon: LucideIcon }> = {
  discovery: { label: "Búsqueda de empresas", subtitulo: "Fuente: infoisinfo.es", icon: Search },
  dedupe_filter: { label: "Filtro y deduplicación", subtitulo: "Código determinista", icon: Filter },
  cheap_pass: { label: "Puntuación rápida", subtitulo: "Modelo económico", icon: Zap },
  deep_analysis: { label: "Análisis profundo", subtitulo: "Modelo avanzado", icon: ScanSearch },
  message_writer: { label: "Redacción de mensaje", subtitulo: "Modelo avanzado", icon: Mail },
};

interface GrupoPaso {
  step: string;
  label: string;
  subtitulo: string;
  icon: LucideIcon;
  cantidad: number;
  estado: "completed" | "running" | "failed";
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
    return { step, label: info?.label || step, subtitulo: info?.subtitulo || "", icon: info?.icon || Search, cantidad: lista.length, estado };
  });
}

function tiempoEnSegundos(run: AgentRun): number {
  if (!run.startedAt) return 0;
  const fin = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  return Math.max(0, Math.round((fin - new Date(run.startedAt).getTime()) / 1000));
}

function tokensCompacto(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** Último razonamiento real disponible (analysis.reason del paso
    deep_analysis más reciente completado) — no hay stream de tokens en
    vivo todavía, así que esto es lo más cercano a "en qué está pensando"
    que se puede mostrar sin inventar nada. */
function ultimoRazonamiento(steps: AgentStep[]): string | null {
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    if (s.step !== "deep_analysis" || s.status !== "completed" || !s.output) continue;
    const analisis = s.output.analisis as { reason?: string } | undefined;
    if (analisis?.reason) return analisis.reason;
  }
  return null;
}

export function TrazaAgente({ run, steps, tipoLabel }: { run: AgentRun; steps: AgentStep[]; tipoLabel: string }) {
  const grupos = agruparPasos(steps);
  const color = ESTADO_RUN_COLOR[run.status];
  const tokensTotal = run.totalTokensInput + run.totalTokensOutput;
  const razonamiento = ultimoRazonamiento(steps);
  const enCurso = run.status === "queued" || run.status === "running";

  return (
    <div className="h-full w-full max-w-110 shrink-0 space-y-4 overflow-y-auto rounded-xl border p-4 text-sm">
      <Link href="/agentes" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft2 className="size-3" /> Agentes / {tipoLabel}
      </Link>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 font-medium">
          <span>Run</span>
          <PillBadge bg="#e8edfc" color="#2451c4" className="text-[11px] font-normal">{tipoLabel}</PillBadge>
          <PillBadge bg={color.bg} color={color.color} className="ml-auto">{ESTADO_RUN_LABEL[run.status]}</PillBadge>
        </div>
        <p className="text-xs text-muted-foreground" title={run.goalText}>{run.goalText}</p>
      </div>

      <ChainOfThought defaultOpen>
        <ChainOfThoughtHeader>Actividad</ChainOfThoughtHeader>
        {grupos.map((g) => {
          const fallo = g.estado === "failed";
          return (
            <ChainOfThoughtStep
              key={g.step}
              icon={fallo ? CircleX : g.icon}
              status={g.estado === "running" ? "active" : "complete"}
              className={fallo ? "text-destructive" : undefined}
              label={g.label}
              description={`${g.subtitulo}${g.cantidad > 1 ? ` · ${g.cantidad}` : ""}`}
            />
          );
        })}
        {grupos.length === 0 && <p className="text-xs text-muted-foreground">Sin actividad todavía.</p>}
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
