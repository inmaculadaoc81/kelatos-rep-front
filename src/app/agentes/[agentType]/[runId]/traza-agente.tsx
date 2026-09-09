"use client";

import Link from "next/link";
import { ArrowLeft2, TickCircle, CloseCircle, Clock, Timer1, SearchNormal1, Filter, Flash, SearchZoomIn, Sms } from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { PillBadge } from "@/components/pill-badge";
import { AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";

// Traza del run en un panel ancho tipo "cómo va pensando el agente":
// línea de tiempo vertical con lo que va tocando (nuestra fuente de
// datos real, nuestros dos niveles de modelo), más un fragmento del
// razonamiento real más reciente que produjo el modelo — no un stream
// de tokens en vivo (esta plataforma no tiene eso todavía), pero sí
// texto real del análisis, no inventado. Sin "sub-agentes"/"skills":
// aquí no existen, sería fabricar estructura que no hay.
const PASO_INFO: Record<string, { label: string; subtitulo: string; icon: Icon }> = {
  discovery: { label: "Búsqueda de empresas", subtitulo: "Fuente: infoisinfo.es", icon: SearchNormal1 },
  dedupe_filter: { label: "Filtro y deduplicación", subtitulo: "Código determinista", icon: Filter },
  cheap_pass: { label: "Puntuación rápida", subtitulo: "Modelo económico", icon: Flash },
  deep_analysis: { label: "Análisis profundo", subtitulo: "Modelo avanzado", icon: SearchZoomIn },
  message_writer: { label: "Redacción de mensaje", subtitulo: "Modelo avanzado", icon: Sms },
};

interface GrupoPaso {
  step: string;
  label: string;
  subtitulo: string;
  icon: Icon;
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
    return { step, label: info?.label || step, subtitulo: info?.subtitulo || "", icon: info?.icon || SearchNormal1, cantidad: lista.length, estado };
  });
}

function IconoEstado({ estado }: { estado: GrupoPaso["estado"] }) {
  if (estado === "completed") return <TickCircle className="size-3.5 shrink-0 text-emerald-600" />;
  if (estado === "failed") return <CloseCircle className="size-3.5 shrink-0 text-destructive" />;
  return <Clock className="size-3.5 shrink-0 animate-pulse text-blue-600" />;
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

  return (
    <div className="h-full w-full max-w-110 shrink-0 space-y-4 overflow-y-auto rounded-xl border bg-card p-4 text-sm">
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

      {razonamiento && (
        <p className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-foreground/80">{razonamiento}</p>
      )}

      <div className="relative">
        <div className="absolute top-3 bottom-3 left-[13px] w-px bg-border" />
        <div className="space-y-3">
          {grupos.map((g) => {
            const Icono = g.icon;
            return (
              <div key={g.step} className="relative flex items-start gap-3">
                <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
                  <Icono className="size-3.5" />
                </span>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-1">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{g.label}</p>
                    <p className="text-xs text-muted-foreground">{g.subtitulo}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                    {g.cantidad > 1 && <span className="text-xs tabular-nums text-muted-foreground">{g.cantidad}</span>}
                    <IconoEstado estado={g.estado} />
                  </div>
                </div>
              </div>
            );
          })}
          {grupos.length === 0 && <p className="pl-10 text-xs text-muted-foreground">Sin actividad todavía.</p>}
        </div>
      </div>

      {run.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{run.error}</p>
      )}

      <div className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
        <Timer1 className="size-3.5" /> Pensando · {tiempoTranscurrido(run)} · {tokensCompacto(tokensTotal)} tokens
      </div>
    </div>
  );
}
