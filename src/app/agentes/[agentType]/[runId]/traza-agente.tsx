"use client";

import Link from "next/link";
import { ArrowLeft2, TickCircle, CloseCircle, Clock } from "@/lib/icons";
import { PillBadge } from "@/components/pill-badge";
import { AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";

// Traza del run en formato panel estrecho — agrupa los pasos reales por
// tipo (agentes.agent_steps.step) en vez de listarlos uno a uno por
// empresa, para que "cheap_pass" sobre 20 empresas sea una sola línea
// con un contador, no 20 filas. No hay "sub-agentes" ni "skills" en
// este sistema (sería inventar conceptos que no existen aquí) — el
// panel se queda con lo que sí es real: los pasos y su estado.
const ETIQUETA_PASO: Record<string, string> = {
  discovery: "Búsqueda de empresas",
  dedupe_filter: "Filtro y deduplicación",
  cheap_pass: "Puntuación rápida",
  deep_analysis: "Análisis profundo",
  message_writer: "Redacción de mensaje",
};

interface GrupoPaso {
  step: string;
  label: string;
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
    return { step, label: ETIQUETA_PASO[step] || step, cantidad: lista.length, estado };
  });
}

function IconoEstadoPaso({ estado }: { estado: GrupoPaso["estado"] }) {
  if (estado === "completed") return <TickCircle className="size-4 shrink-0 text-emerald-600" />;
  if (estado === "failed") return <CloseCircle className="size-4 shrink-0 text-destructive" />;
  return <Clock className="size-4 shrink-0 animate-pulse text-blue-600" />;
}

function tiempoTranscurrido(run: AgentRun): string {
  if (!run.startedAt) return "—";
  const fin = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  const ms = Math.max(0, fin - new Date(run.startedAt).getTime());
  const min = Math.floor(ms / 60000);
  const seg = Math.round((ms % 60000) / 1000);
  return min > 0 ? `${min}m ${seg}s` : `${seg}s`;
}

function tokensCompacto(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function TrazaAgente({ run, steps, tipoLabel }: { run: AgentRun; steps: AgentStep[]; tipoLabel: string }) {
  const grupos = agruparPasos(steps);
  const color = ESTADO_RUN_COLOR[run.status];
  const tokensTotal = run.totalTokensInput + run.totalTokensOutput;

  return (
    <div className="w-full max-w-[300px] shrink-0 space-y-4 rounded-xl border bg-card p-4 text-sm">
      <Link href="/agentes" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft2 className="size-3" /> Agentes / {tipoLabel}
      </Link>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 font-medium">
          <span>Run</span>
          <PillBadge bg="#e8edfc" color="#2451c4" className="text-[11px] font-normal">{tipoLabel}</PillBadge>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground" title={run.goalText}>{run.goalText}</p>
      </div>

      <PillBadge bg={color.bg} color={color.color}>{ESTADO_RUN_LABEL[run.status]}</PillBadge>

      <div className="space-y-2.5">
        {grupos.map((g) => (
          <div key={g.step} className="flex items-center gap-2">
            <IconoEstadoPaso estado={g.estado} />
            <span className="flex-1 truncate">{g.label}</span>
            {g.cantidad > 1 && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{g.cantidad}</span>}
          </div>
        ))}
        {grupos.length === 0 && <p className="text-xs text-muted-foreground">Sin actividad todavía.</p>}
      </div>

      <div className="border-t pt-3 text-xs text-muted-foreground">
        Pensando · {tiempoTranscurrido(run)} · {tokensCompacto(tokensTotal)} tokens
      </div>
    </div>
  );
}
