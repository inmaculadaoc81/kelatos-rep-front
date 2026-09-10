"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, Send, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PillBadge } from "@/components/pill-badge";
import { useConfirm } from "@/components/confirm-provider";
import { ArrowLeft2 } from "@/lib/icons";
import {
  Campaign,
  AgentEvent,
  CampaignLead,
  CampaignBudget,
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_COLOR,
  PIPELINE_STAGES,
  SERVICE_LABEL,
} from "@/lib/campanas";

const MSG_COLOR: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#e5e7eb", color: "#374151" },
  approved: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
  dispatched: { bg: "#e0f2fe", color: "#0369a1" },
};

const AGENT_COLOR: Record<string, string> = {
  orchestrator: "bg-muted-foreground/40",
  campaign_planner: "bg-violet-500",
  marketing_manager: "bg-amber-500",
  web_research: "bg-cyan-600",
  qualification: "bg-emerald-500",
  offer_strategy: "bg-blue-500",
  outreach: "bg-orange-500",
};

export default function CampanaDetallePage() {
  const params = useParams<{ id: string }>();
  const confirmar = useConfirm();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [budget, setBudget] = useState<CampaignBudget | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [planAbierto, setPlanAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [c, e, l, b] = await Promise.all([
        fetch(`/api/agentes/campanas/${params.id}`).then((r) => r.json()),
        fetch(`/api/agentes/campanas/${params.id}/events`).then((r) => r.json()),
        fetch(`/api/agentes/campanas/${params.id}/leads`).then((r) => r.json()),
        fetch(`/api/agentes/campanas/${params.id}/budget`).then((r) => r.json()),
      ]);
      if (c.ok) {
        setCampaign(c.campaign as Campaign);
        setProgress((c.progress as Record<string, number>) ?? {});
      }
      if (e.ok) setEvents(e.events as AgentEvent[]);
      if (l.ok) setLeads(l.leads as CampaignLead[]);
      if (b.ok) setBudget(b.budget as CampaignBudget);
    } catch {
      // silencioso
    } finally {
      setCargando(false);
    }
  }, [params.id]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
  }, [cargar]);

  async function lanzar() {
    setEnviando(true);
    try {
      const res = await fetch(`/api/agentes/campanas/${params.id}/launch`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error");
      toast.success("Campaña lanzada");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }

  async function revisar(lead: CampaignLead, status: "approved" | "rejected") {
    if (status === "rejected") {
      const ok = await confirmar(`¿Rechazar el borrador para "${lead.name}"? No se enviará nada.`, { titulo: "Rechazar" });
      if (!ok) return;
    }
    try {
      const res = await fetch(`/api/agentes/campanas/${params.id}/leads/${lead.companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  async function dispatch() {
    const ok = await confirmar("¿Disparar a n8n los borradores aprobados?", { titulo: "Enviar a n8n" });
    if (!ok) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/agentes/campanas/${params.id}/dispatch`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error");
      toast.success(
        data.configured
          ? `Disparados: ${data.dispatched}${data.failed ? `, fallidos: ${data.failed}` : ""}`
          : data.note || "n8n no configurado",
      );
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!campaign) return <p className="text-sm text-muted-foreground">Campaña no encontrada.</p>;

  const col = CAMPAIGN_STATUS_COLOR[campaign.status];
  const aprobados = leads.filter((l) => l.messageStatus === "approved").length;
  const pctBudget = budget && budget.maxCostUsd > 0 ? Math.min(100, (budget.costUsd / budget.maxCostUsd) * 100) : 0;
  const doneStages = new Set(events.map((e) => e.action.replace(/_completed$/, "")).filter((a) => PIPELINE_STAGES.some((s) => s.key === a || s.key === a.replace(/_strategy$/, ""))));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/agentes/campanas" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft2 className="size-3" /> Campañas
      </Link>

      {/* Header */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{campaign.name}</h1>
              <PillBadge bg={col.bg} color={col.color} className="text-[11px]">{CAMPAIGN_STATUS_LABEL[campaign.status]}</PillBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{campaign.goalText}</p>
          </div>
          <div className="flex items-center gap-2">
            {campaign.status === "draft" && (
              <Button size="sm" onClick={lanzar} disabled={enviando}>Lanzar campaña</Button>
            )}
            {aprobados > 0 && (
              <Button size="sm" variant="outline" onClick={dispatch} disabled={enviando}>
                <Send className="size-4" /> Enviar a n8n ({aprobados})
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Coste</p>
            <p className="text-sm font-semibold tabular-nums">${campaign.costUsd.toFixed(4)} / ${campaign.maxCostUsd.toFixed(2)}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${pctBudget}%` }} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Objetivo</p>
            <p className="text-sm font-semibold tabular-nums">
              {campaign.plan?.targetLeads ?? campaign.targetLeads ?? "—"} leads · {leads.length} calificados
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Recursos</p>
            <p className="text-sm text-muted-foreground">
              {budget?.byResource.map((r) => `${r.resource}:${r.calls}`).join(" · ") || "—"}
            </p>
          </div>
        </div>

        {campaign.plan && (
          <div className="mt-3 border-t pt-2">
            <button
              type="button"
              onClick={() => setPlanAbierto((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={`size-3.5 transition-transform ${planAbierto ? "" : "-rotate-90"}`} /> Plan del Campaign Planner
            </button>
            {planAbierto && (
              <div className="mt-2 space-y-1 text-xs">
                <p><span className="text-muted-foreground">ICP:</span> {campaign.plan.icp}</p>
                <p><span className="text-muted-foreground">Propuesta:</span> {campaign.plan.valueProposition}</p>
                <p><span className="text-muted-foreground">Señales +:</span> {campaign.plan.positiveSignals.join("; ")}</p>
                <p><span className="text-muted-foreground">Señales −:</span> {campaign.plan.negativeSignals.join("; ")}</p>
                <p><span className="text-muted-foreground">Canales:</span> {campaign.plan.channels.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stepper de etapas */}
      <div className="rounded-xl border bg-white p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Pipeline</p>
        <div className="flex flex-wrap gap-x-1 gap-y-2">
          {PIPELINE_STAGES.map((s, i) => {
            const n = s.progressKey ? progress[s.progressKey] : undefined;
            const done = doneStages.has(s.key);
            return (
              <div key={s.key} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/30">→</span>}
                <div className={`rounded-md border px-2 py-1 text-center ${done ? "border-emerald-200 bg-emerald-50" : "border-border bg-muted/30"}`}>
                  <p className="text-[11px] font-medium">{s.label}</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">{n ?? (done ? "✓" : "·")}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Timeline de decisiones */}
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Actividad del equipo</p>
          <div className="max-h-128 space-y-2 overflow-y-auto pr-1 text-xs">
            {events.length === 0 && <p className="text-muted-foreground">Sin actividad todavía.</p>}
            {events.map((ev) => (
              <div key={ev.id} className="flex gap-2">
                <span className={`mt-1 size-1.5 shrink-0 rounded-full ${AGENT_COLOR[ev.agentSlug] ?? "bg-muted-foreground/40"}`} />
                <div className="min-w-0">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{ev.agentSlug}</span> · {ev.action}
                    {ev.companyName ? ` · ${ev.companyName}` : ""}
                  </p>
                  <p>{ev.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leads + borradores */}
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Leads calificados ({leads.length})</p>
          <div className="max-h-128 space-y-3 overflow-y-auto pr-1">
            {leads.length === 0 && <p className="text-xs text-muted-foreground">Sin leads calificados todavía.</p>}
            {leads.map((lead) => (
              <div key={lead.companyId} className="rounded-lg border p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lead.name}</p>
                    <p className="text-muted-foreground">
                      fit {lead.fit ?? "—"} · score {lead.score ?? "—"}
                      {lead.offer ? ` · ${SERVICE_LABEL[lead.offer] ?? lead.offer}` : ""}
                    </p>
                  </div>
                  {lead.messageStatus && (
                    <PillBadge
                      bg={(MSG_COLOR[lead.messageStatus] ?? MSG_COLOR.draft).bg}
                      color={(MSG_COLOR[lead.messageStatus] ?? MSG_COLOR.draft).color}
                      className="shrink-0 text-[10px]"
                    >
                      {lead.messageStatus}
                    </PillBadge>
                  )}
                </div>

                {lead.angle && <p className="mt-1 text-muted-foreground">{lead.angle}</p>}

                {lead.message && (
                  <div className="mt-2 rounded-md border bg-muted/40 p-2">
                    {lead.subject && <p className="font-medium">{lead.subject}</p>}
                    <p className="mt-0.5 whitespace-pre-wrap">{lead.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">canal: {lead.channel}</p>
                  </div>
                )}

                {lead.messageStatus === "draft" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-emerald-600" onClick={() => revisar(lead, "approved")}>
                      <Check className="size-3.5" /> Aprobar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={() => revisar(lead, "rejected")}>
                      <X className="size-3.5" /> Rechazar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
