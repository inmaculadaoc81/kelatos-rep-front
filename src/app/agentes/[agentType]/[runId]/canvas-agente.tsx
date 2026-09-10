"use client";

import { useEffect, useState } from "react";
import { ChevronDown, UserCheck, Check, X } from "lucide-react";
import { SearchNormal1, Global, Cpu } from "@/lib/icons";
import { AgentLead, AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import { PillBadge } from "@/components/pill-badge";
import { useConfirm } from "@/components/confirm-provider";

// Canvas de nodos conectados (mismo lenguaje visual que un editor de
// agentes tipo flow-builder: tarjetas + líneas punteadas curvas con un
// punto en cada extremo) pero con datos reales de ESTE run, no
// decorativo: "Entrada" es run.input de verdad, "Herramientas" se
// enciende en azul solo mientras el paso discovery está corriendo de
// verdad, "Embudo" es el embudo real (encontradas → candidatas → pase
// rápido → calificadas) sacado de run.progress, y "Leads" son los leads
// calificados de verdad, con aprobar/rechazar cableado al mismo
// PATCH /v1/agentes/runs/:id/leads/:companyId que ya usaba la tabla.
//
// Las tarjetas y los puntos de conexión comparten el mismo sistema de
// coordenadas porcentual (0-100) que el viewBox del SVG con
// preserveAspectRatio="none", así que quedan alineados sin medir el DOM
// en tiempo de ejecución.
const MAX_LEADS_VISIBLES = 3;

const ESTADO_MENSAJE_LABEL: Record<string, string> = { draft: "Borrador", approved: "Aprobado", rejected: "Rechazado" };
const ESTADO_MENSAJE_COLOR: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#e5e7eb", color: "#374151" },
  approved: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

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
      className="absolute rounded-[22px] border bg-[#F9FAFB] pt-3 pb-1 shadow-sm"
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%` }}
    >
      <p className="mb-2 flex items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground">
        <ChevronDown className="size-3.5" /> {titulo}
      </p>
      <div className="mx-1 rounded-[16px] border bg-card p-3">{children}</div>
    </div>
  );
}

export function CanvasAgente({ run, steps, tipoLabel }: { run: AgentRun; steps: AgentStep[]; tipoLabel: string }) {
  const confirmar = useConfirm();
  const color = ESTADO_RUN_COLOR[run.status];
  const progreso = run.progress as Record<string, number | undefined>;

  const [leads, setLeads] = useState<AgentLead[]>([]);

  async function cargarLeads() {
    try {
      const res = await fetch(`/api/agentes/runs/${run.id}/leads`);
      const data = await res.json();
      if (data.ok) setLeads(data.leads as AgentLead[]);
    } catch {
      // silencioso — la tarjeta se queda con lo último que cargó bien
    }
  }

  useEffect(() => {
    cargarLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id, run.status]);

  async function revisar(lead: AgentLead, status: "approved" | "rejected") {
    if (status === "rejected") {
      const ok = await confirmar(`¿Rechazar el mensaje para "${lead.name}"? No se enviará nada.`, { titulo: "Rechazar lead" });
      if (!ok) return;
    }
    try {
      const res = await fetch(`/api/agentes/runs/${run.id}/leads/${lead.companyId}`, {
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
  const hayLeadsPendientes = leads.some((l) => l.messageStatus === "draft");

  const sector = typeof run.input.sector === "string" ? run.input.sector : null;
  const ubicacion = typeof run.input.location === "string" ? run.input.location : null;
  const limite = typeof run.input.limit === "number" ? run.input.limit : null;

  const embudo = [
    { label: "Encontradas", valor: progreso.companiesFound },
    { label: "Candidatas", valor: progreso.companiesCandidate },
    { label: "Pase rápido", valor: progreso.companiesCheapPass },
    { label: "Calificadas", valor: progreso.companiesQualified },
  ];

  const leadsVisibles = leads.slice(0, MAX_LEADS_VISIBLES);
  const leadsRestantes = leads.length - leadsVisibles.length;

  return (
    <div
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
      {/* Grilla de 3 columnas: las 3 primeras tarjetas de cada columna
          arrancan en la misma fila (ROW_TOP) — antes "Herramientas"
          arrancaba más arriba que "Entrada"/"Agente". Las siguientes
          tarjetas de cada columna se apilan debajo de la de arriba. Sin
          línea Agente→Leads: al ir justo debajo no hace falta conector. */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-border">
        <path d="M23,16 C 30,16 29,22 36,22" fill="none" stroke="currentColor" strokeDasharray="0.3 0.4" strokeWidth="0.18" />
        <path
          d="M60,22 C 65,22 64,16 70,16"
          fill="none"
          stroke={discoveryActivo ? "#3b82f6" : "currentColor"}
          strokeDasharray="0.3 0.4"
          strokeWidth="0.18"
        />
        <path
          d="M60,22 C 65,22 64,36 70,36"
          fill="none"
          stroke={pipelineActivo ? "#3b82f6" : "currentColor"}
          strokeDasharray="0.3 0.4"
          strokeWidth="0.18"
        />
        <Punto x={23} y={16} activo={false} />
        <Punto x={36} y={22} activo={false} />
        <Punto x={60} y={22} activo={discoveryActivo || pipelineActivo} />
        <Punto x={70} y={16} activo={discoveryActivo} />
        <Punto x={70} y={36} activo={pipelineActivo} />
      </svg>

      <Tarjeta left={3} top={8} width={20} titulo="Entrada">
        <div className="-mx-3 divide-y divide-border text-xs">
          <p className="px-3 py-1.5"><span className="text-muted-foreground">Sector: </span>{sector || "—"}</p>
          <p className="px-3 py-1.5"><span className="text-muted-foreground">Ubicación: </span>{ubicacion || "—"}</p>
          <p className="px-3 py-1.5"><span className="text-muted-foreground">Límite: </span>{limite ?? "—"}</p>
        </div>
      </Tarjeta>

      <Tarjeta left={36} top={8} width={24} titulo="Agente">
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
        top={8}
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
        top={26}
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

      <Tarjeta
        left={36}
        top={30}
        width={24}
        titulo={
          <>
            <span className={`size-1.5 shrink-0 rounded-full ${hayLeadsPendientes ? "animate-pulse bg-blue-500" : "bg-muted-foreground/30"}`} />
            <UserCheck className="size-3.5" /> Leads
          </>
        }
      >
        {leadsVisibles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin leads calificados todavía.</p>
        ) : (
          <div className="-mx-3 divide-y divide-border text-xs">
            {leadsVisibles.map((lead) => (
              <div key={lead.companyId} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{lead.name}</p>
                  <p className="text-muted-foreground">Score {lead.score ?? "—"}</p>
                </div>
                {lead.messageStatus === "draft" ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      title="Aprobar"
                      onClick={() => revisar(lead, "approved")}
                      className="flex size-5 items-center justify-center rounded-sm border border-border text-emerald-600 hover:bg-emerald-50"
                    >
                      <Check className="size-3" />
                    </button>
                    <button
                      type="button"
                      title="Rechazar"
                      onClick={() => revisar(lead, "rejected")}
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
            {leadsRestantes > 0 && <p className="px-3 py-1.5 text-muted-foreground">+{leadsRestantes} más</p>}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
