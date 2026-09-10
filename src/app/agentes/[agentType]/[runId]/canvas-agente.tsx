"use client";

import { ChevronDown } from "lucide-react";
import { SearchNormal1, Global, Cpu } from "@/lib/icons";
import { AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import { PillBadge } from "@/components/pill-badge";

// Canvas de nodos conectados (mismo lenguaje visual que un editor de
// agentes tipo flow-builder: tarjetas + líneas punteadas curvas con un
// punto en cada extremo) pero con datos reales de ESTE run, no
// decorativo: "Entrada" es run.input de verdad, "Herramientas" se
// enciende en azul solo mientras el paso discovery está corriendo de
// verdad, y "Pipeline" es el embudo real (encontradas → candidatas →
// pase rápido → calificadas) sacado de run.progress.
//
// Las tarjetas y los puntos de conexión comparten el mismo sistema de
// coordenadas porcentual (0-100) que el viewBox del SVG con
// preserveAspectRatio="none", así que quedan alineados sin medir el DOM
// en tiempo de ejecución.
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
// border-radius 24 (rounded-3xl).
function Tarjeta({
  left,
  top,
  width,
  titulo,
  children,
}: {
  left: number;
  top: number;
  width: number;
  titulo: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute rounded-[22px] border bg-card pt-3 pb-2 shadow-sm"
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%` }}
    >
      <p className="mb-2 flex items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground">
        <ChevronDown className="size-3.5" /> {titulo}
      </p>
      <div className="mx-1 rounded-[16px] border bg-muted/20 p-3">{children}</div>
    </div>
  );
}

export function CanvasAgente({ run, steps, tipoLabel }: { run: AgentRun; steps: AgentStep[]; tipoLabel: string }) {
  const color = ESTADO_RUN_COLOR[run.status];
  const progreso = run.progress as Record<string, number | undefined>;

  const discoveryActivo = steps.some((s) => s.step === "discovery" && s.status === "running");
  const pipelineActivo = steps.some((s) => ["cheap_pass", "deep_analysis", "message_writer"].includes(s.step) && s.status === "running");

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
      className="relative h-full flex-1 overflow-hidden rounded-xl border"
      style={{ backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-border">
        <path d="M23,44 C 30,44 29,42 36,42" fill="none" stroke="currentColor" strokeDasharray="0.6 0.8" strokeWidth="0.25" />
        <path
          d="M64,42 C 68,42 66,18 70,18"
          fill="none"
          stroke={discoveryActivo ? "#3b82f6" : "currentColor"}
          strokeDasharray="0.6 0.8"
          strokeWidth="0.25"
        />
        <path
          d="M64,42 C 68,42 66,58 70,58"
          fill="none"
          stroke={pipelineActivo ? "#3b82f6" : "currentColor"}
          strokeDasharray="0.6 0.8"
          strokeWidth="0.25"
        />
        <Punto x={23} y={44} activo={false} />
        <Punto x={36} y={42} activo={false} />
        <Punto x={64} y={42} activo={discoveryActivo || pipelineActivo} />
        <Punto x={70} y={18} activo={discoveryActivo} />
        <Punto x={70} y={58} activo={pipelineActivo} />
      </svg>

      <Tarjeta left={3} top={36} width={20} titulo="Entrada">
        <div className="space-y-1.5 text-xs">
          <p><span className="text-muted-foreground">Sector: </span>{sector || "—"}</p>
          <p><span className="text-muted-foreground">Ubicación: </span>{ubicacion || "—"}</p>
          <p><span className="text-muted-foreground">Límite: </span>{limite ?? "—"}</p>
        </div>
      </Tarjeta>

      <Tarjeta left={36} top={28} width={28} titulo="Agente">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-teal-600 text-white">
            <Cpu className="size-3.5" />
          </span>
          <p className="truncate text-sm font-medium">{tipoLabel}</p>
        </div>
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{run.goalText}</p>
        <PillBadge bg={color.bg} color={color.color} className="text-[11px]">{ESTADO_RUN_LABEL[run.status]}</PillBadge>
      </Tarjeta>

      <Tarjeta
        left={70}
        top={10}
        width={27}
        titulo={
          <>
            <Global className="size-3.5" /> Herramientas
          </>
        }
      >
        <div className="flex items-center gap-2 text-xs">
          <span className={`size-1.5 shrink-0 rounded-full ${discoveryActivo ? "animate-pulse bg-blue-500" : "bg-muted-foreground/30"}`} />
          <SearchNormal1 className="size-3.5 text-muted-foreground" />
          <span>infoisinfo.es</span>
          {discoveryActivo && <span className="ml-auto text-[11px] text-blue-600">buscando…</span>}
        </div>
      </Tarjeta>

      <Tarjeta
        left={70}
        top={48}
        width={27}
        titulo={
          <>
            <span className={`size-1.5 shrink-0 rounded-full ${pipelineActivo ? "animate-pulse bg-blue-500" : "bg-muted-foreground/30"}`} />
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
    </div>
  );
}
