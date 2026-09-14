"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check, X, Maximize2, Minimize2, Send, UsersRound,
  Globe2, Building2, BrainCircuit, MessageSquare, Layers,
} from "lucide-react";
import { Cpu } from "@/lib/icons";
import { AgentRun, AgentStep, ESTADO_RUN_COLOR, ESTADO_RUN_LABEL } from "@/lib/agentes";
import type { LinkedInContact } from "@/lib/campanas";
import { CONTACT_ROLE_LABEL } from "@/lib/campanas";
import { PillBadge } from "@/components/pill-badge";
import { useConfirm } from "@/components/confirm-provider";
import {
  ERROR_CLASE, tokensCompacto, duracionRunMs, formatearDuracion,
  FaviconApp, IconoCaja, PuntoConector, curvaConector, Tarjeta,
} from "./canvas-shared";
import { ContactoDetailModal, ESTADO_LABEL, ESTADO_COLOR } from "./linkedin-contacts-table";

// Canvas del Agente LinkedIn independiente — mismo lenguaje visual que
// CanvasAgente (campaign_pipeline), con SUS 4 etapas reales en vez de
// las de una campaña: Entrada (campaña de origen) → Herramientas
// (búsqueda pública) → Agente → Contactos (con aprobar/rechazar) →
// Progreso (embudo propio) → Salida (mensajes aprobados listos).
const HERRAMIENTAS: { nombre: string; detalle: string; dominio: string }[] = [
  { nombre: "DuckDuckGo", detalle: "Búsqueda pública de perfiles", dominio: "duckduckgo.com" },
  { nombre: "Web de la empresa", detalle: "Equipo / Sobre nosotros", dominio: "google.com" },
];

export function CanvasLinkedIn({
  run,
  steps,
  tipoLabel,
}: {
  run: AgentRun;
  steps: AgentStep[];
  tipoLabel: string;
}) {
  const confirmar = useConfirm();
  const color = ESTADO_RUN_COLOR[run.status];
  const progreso = run.progress as Record<string, number | undefined>;
  const campaignId = run.campaignId;

  const [contactos, setContactos] = useState<LinkedInContact[]>([]);
  const [abiertoId, setAbiertoId] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [ampliado, setAmpliado] = useState(false);

  useEffect(() => {
    const alCambiar = () => setAmpliado(document.fullscreenElement === canvasRef.current);
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);

  const entradaRef = useRef<HTMLDivElement>(null);
  const herramientasRef = useRef<HTMLDivElement>(null);
  const agenteRef = useRef<HTMLDivElement>(null);
  const progresoRef = useRef<HTMLDivElement>(null);

  type PuntoXY = { x: number; y: number };
  const [conectores, setConectores] = useState<{
    entrada: PuntoXY;
    herramientas: PuntoXY;
    agenteIzq: PuntoXY;
    agenteDer: PuntoXY;
    progreso: PuntoXY;
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
      const prog = medir(progresoRef.current, cont, "izq");
      if (entrada && herramientas && agenteIzq && agenteDer && prog) {
        setConectores({ entrada, herramientas, agenteIzq, agenteDer, progreso: prog });
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
  }, [contactos.length]);

  function alternarAmpliado() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      canvasRef.current?.requestFullscreen().catch(() => {});
    }
  }

  async function cargarContactos() {
    if (!campaignId) return;
    try {
      const res = await fetch(`/api/agentes/campanas/${campaignId}/linkedin-contacts`);
      const data = await res.json();
      if (data.ok) setContactos(data.contacts as LinkedInContact[]);
    } catch {
      // silencioso — la tarjeta se queda con lo último que cargó bien
    }
  }

  useEffect(() => {
    cargarContactos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, run.status]);

  async function revisar(c: LinkedInContact, status: "approved" | "rejected") {
    if (!campaignId) return;
    if (status === "rejected") {
      const ok = await confirmar(`¿Rechazar el mensaje para "${c.contactName}"? No se enviará nada.`, { titulo: "Rechazar mensaje" });
      if (!ok) return;
    }
    try {
      const res = await fetch(`/api/agentes/campanas/${campaignId}/linkedin-messages/${c.messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(status === "approved" ? "Mensaje aprobado" : "Mensaje rechazado");
      await cargarContactos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar");
    }
  }

  async function marcarEnviado(c: LinkedInContact) {
    if (!campaignId) return;
    const ok = await confirmar(
      `¿Confirmas que enviaste este mensaje a "${c.contactName}" manualmente desde LinkedIn?`,
      { titulo: "Marcar como enviado" },
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/agentes/campanas/${campaignId}/linkedin-messages/${c.messageId}/mark-sent`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Marcado como enviado");
      await cargarContactos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al marcar como enviado");
    }
  }

  async function revisarYCerrar(c: LinkedInContact, status: "approved" | "rejected") {
    await revisar(c, status);
    setAbiertoId(null);
  }

  async function marcarEnviadoYCerrar(c: LinkedInContact) {
    await marcarEnviado(c);
    setAbiertoId(null);
  }

  function abrir(c: LinkedInContact) {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setAbiertoId(c.contactId);
  }

  const discoveryActivo = steps.some((s) => s.step === "linkedin_contact_discovery" && s.status === "running");
  const discoveryFallo = steps.some((s) => s.step === "linkedin_contact_discovery" && s.status === "failed");
  const pipelineActivo = steps.some((s) => ["linkedin_contact_analysis", "linkedin_message_strategy"].includes(s.step) && s.status === "running");
  const pipelineFallo = steps.some((s) => ["linkedin_contact_analysis", "linkedin_message_strategy"].includes(s.step) && s.status === "failed");
  const runFallo = run.status === "failed";
  const hayPendientes = contactos.some((c) => c.messageStatus === "draft");
  const abierto = contactos.find((c) => c.contactId === abiertoId) || null;
  const aprobados = contactos.filter((c) => c.messageStatus === "approved");

  const sourceRunId = typeof run.input.sourceRunId === "number" ? run.input.sourceRunId : Number(run.input.sourceRunId) || null;
  const companyIds = Array.isArray(run.input.companyIds) ? (run.input.companyIds as unknown[]) : null;

  const embudo: { label: string; valor: number | undefined; icon: typeof Layers }[] = [
    { label: "Empresas importadas", valor: progreso.companiesImported, icon: Building2 },
    { label: "Contactos encontrados", valor: progreso.contactsFound, icon: UsersRound },
    { label: "Contactos analizados", valor: progreso.contactsAnalyzed, icon: BrainCircuit },
    { label: "Mensajes redactados", valor: progreso.linkedinDraftsCreated, icon: MessageSquare },
  ];

  return (
    <div
      ref={canvasRef}
      className="relative h-full flex-1 overflow-hidden rounded-xl border bg-white"
      style={{
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

      {conectores && (() => {
        const colorIzq = discoveryActivo ? "#3b82f6" : "#8b5cf6";
        const colorDer = pipelineActivo ? "#3b82f6" : "#10b981";
        return (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <path d={curvaConector(conectores.entrada, conectores.agenteIzq)} fill="none" stroke={colorIzq} strokeDasharray="0.3 0.4" strokeWidth="0.18" />
              <path d={curvaConector(conectores.herramientas, conectores.agenteIzq)} fill="none" stroke={colorIzq} strokeDasharray="0.3 0.4" strokeWidth="0.18" />
              <path d={curvaConector(conectores.agenteDer, conectores.progreso)} fill="none" stroke={colorDer} strokeDasharray="0.3 0.4" strokeWidth="0.18" />
            </svg>
            <PuntoConector x={conectores.entrada.x} y={conectores.entrada.y} color={colorIzq} />
            <PuntoConector x={conectores.herramientas.x} y={conectores.herramientas.y} color={colorIzq} />
            <PuntoConector x={conectores.agenteIzq.x} y={conectores.agenteIzq.y} color={colorIzq} />
            <PuntoConector x={conectores.agenteDer.x} y={conectores.agenteDer.y} color={colorDer} />
            <PuntoConector x={conectores.progreso.x} y={conectores.progreso.y} color={colorDer} />
          </>
        );
      })()}

      {/* Columna 1 — de dónde viene y con qué busca */}
      <div className="absolute flex flex-col gap-4" style={{ left: "3%", width: "22%", top: "8%" }}>
        <Tarjeta ref={entradaRef} titulo="Entrada">
          <div className="-mx-3 divide-y divide-border text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <IconoCaja icon={Layers} />
              <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Run de origen</p><p className="truncate font-medium">#{sourceRunId ?? "—"}</p></div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <IconoCaja icon={Building2} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Empresas</p>
                <p className="truncate font-medium">{companyIds ? `${companyIds.length} seleccionadas` : "Todas las calificadas"}</p>
              </div>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta
          ref={herramientasRef}
          claseExterior={discoveryFallo ? ERROR_CLASE : "border-violet-200 bg-violet-50/60"}
          titulo={
            <span className="flex items-center gap-1.5 text-violet-700">
              <Globe2 className="size-3.5" /> Herramientas
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
          <p className="mt-2 border-t px-1 pt-2 text-[10px] text-muted-foreground">
            Nunca hace fetch a linkedin.com — solo lee resultados de búsqueda pública y la propia web de la empresa.
          </p>
        </Tarjeta>
      </div>

      {/* Columna 2 — el agente y los contactos que va encontrando */}
      <div className="absolute flex flex-col gap-4" style={{ left: "36%", width: "26%", top: "8%" }}>
        <Tarjeta ref={agenteRef} claseExterior={runFallo ? ERROR_CLASE : undefined} titulo="Agente">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-blue-600 text-white">
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
              <span className={`size-1.5 shrink-0 rounded-full ${hayPendientes ? "animate-pulse bg-blue-500" : "bg-muted-foreground/30"}`} />
              <UsersRound className="size-3.5" /> Contactos
            </>
          }
        >
          {contactos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin contactos encontrados todavía.</p>
          ) : (
            <div className="-mx-3 max-h-56 divide-y divide-border overflow-y-auto text-xs">
              {contactos.map((c) => (
                <div key={c.contactId} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => abrir(c)}
                    className="-my-1 flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1 text-left hover:bg-black/5"
                  >
                    <IconoCaja icon={UsersRound} />
                    <span className="min-w-0">
                      <p className="truncate font-medium">{c.contactName}</p>
                      <p className="truncate text-muted-foreground">{c.companyName} · {CONTACT_ROLE_LABEL[c.roleCategory] ?? c.roleCategory}</p>
                    </span>
                  </button>
                  {c.messageStatus === "draft" ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        title="Aprobar"
                        onClick={(e) => { e.stopPropagation(); revisar(c, "approved"); }}
                        className="flex size-5 items-center justify-center rounded-sm border border-border text-emerald-600 hover:bg-emerald-50"
                      >
                        <Check className="size-3" />
                      </button>
                      <button
                        type="button"
                        title="Rechazar"
                        onClick={(e) => { e.stopPropagation(); revisar(c, "rejected"); }}
                        className="flex size-5 items-center justify-center rounded-sm border border-border text-destructive hover:bg-destructive/10"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    c.messageStatus && (
                      <PillBadge bg={ESTADO_COLOR[c.messageStatus].bg} color={ESTADO_COLOR[c.messageStatus].color} className="shrink-0 text-[10px]">
                        {ESTADO_LABEL[c.messageStatus]}
                      </PillBadge>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </Tarjeta>
      </div>

      {/* Columna 3 — progreso del embudo propio y salida */}
      <div className="absolute flex flex-col gap-4" style={{ left: "70%", width: "22%", top: "8%" }}>
        <Tarjeta
          ref={progresoRef}
          claseExterior={pipelineFallo ? ERROR_CLASE : undefined}
          titulo={
            <>
              <span className={`size-1.5 shrink-0 rounded-full ${pipelineFallo ? "bg-destructive" : pipelineActivo ? "animate-pulse bg-blue-500" : "bg-muted-foreground/30"}`} />
              Progreso
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
              {aprobados.map((c) => (
                <button
                  key={c.contactId}
                  type="button"
                  onClick={() => abrir(c)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-black/5"
                >
                  <IconoCaja icon={Send} />
                  <span className="min-w-0">
                    <p className="truncate font-medium">{c.contactName}</p>
                    <p className="truncate text-muted-foreground">{c.companyName}</p>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Tarjeta>
      </div>

      <div className="absolute right-3 bottom-3 z-20 flex flex-col items-end gap-1">
        <div className="flex items-stretch gap-4 text-center">
          <div>
            <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Coste</p>
            <p className="text-sm font-semibold tabular-nums">${run.totalCostUsd.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Tokens</p>
            <p className="text-sm font-semibold tabular-nums" title={`${run.totalTokensInput} entrada · ${run.totalTokensOutput} salida`}>
              {tokensCompacto(run.totalTokensInput + run.totalTokensOutput)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">Duración</p>
            <p className="text-sm font-semibold tabular-nums">{formatearDuracion(duracionRunMs(run))}</p>
          </div>
        </div>
      </div>

      {abierto && (
        <ContactoDetailModal
          contacto={abierto}
          onClose={() => setAbiertoId(null)}
          onAprobar={() => revisarYCerrar(abierto, "approved")}
          onRechazar={() => revisarYCerrar(abierto, "rejected")}
          onMarcarEnviado={() => marcarEnviadoYCerrar(abierto)}
        />
      )}
    </div>
  );
}
