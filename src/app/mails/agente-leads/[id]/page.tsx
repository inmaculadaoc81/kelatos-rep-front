"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PillBadge } from "@/components/pill-badge";
import { ArrowLeft2 } from "@/lib/icons";
import { AgentRun, AgentStep } from "@/lib/agentes";
import { Campaign, AgentEvent, CampaignBudget, CAMPAIGN_STATUS_LABEL, CAMPAIGN_STATUS_COLOR } from "@/lib/campanas";
import { CanvasAgente } from "@/app/agentes/[agentType]/[runId]/canvas-agente";

export default function AgenteLeadsCampanaPage() {
  const params = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [eventos, setEventos] = useState<AgentEvent[]>([]);
  const [budget, setBudget] = useState<CampaignBudget | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const c = await fetch(`/api/agentes/campanas/${params.id}`).then((r) => r.json());
        const ev = await fetch(`/api/agentes/campanas/${params.id}/events`).then((r) => r.json());
        const bg = await fetch(`/api/agentes/campanas/${params.id}/budget`).then((r) => r.json());
        const rr = c.ok && c.runId ? await fetch(`/api/agentes/runs/${c.runId}`).then((r) => r.json()) : null;
        if (!activo) return;
        if (c.ok) setCampaign(c.campaign as Campaign);
        if (ev.ok) setEventos(ev.events as AgentEvent[]);
        if (bg.ok) {
          setBudget({
            maxCostUsd: Number(bg.maxCostUsd ?? 0),
            costUsd: Number(bg.costUsd ?? 0),
            remainingUsd: Number(bg.remainingUsd ?? 0),
            byResource: Array.isArray(bg.byResource) ? bg.byResource : [],
          });
        }
        if (rr?.ok) {
          setRun(rr.run as AgentRun);
          setSteps(rr.steps as AgentStep[]);
        }
      } catch {
        // silencioso
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    const t = setInterval(cargar, 5000);
    return () => {
      activo = false;
      clearInterval(t);
    };
  }, [params.id]);

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!campaign) return <p className="text-sm text-muted-foreground">Campaña no encontrada.</p>;

  const col = CAMPAIGN_STATUS_COLOR[campaign.status];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Link href="/mails/agente-leads" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft2 className="size-3" /> Campañas
        </Link>
        <PillBadge bg={col.bg} color={col.color} className="text-[11px]">{CAMPAIGN_STATUS_LABEL[campaign.status]}</PillBadge>
      </div>

      {run ? (
        <div className="flex h-[calc(100svh-7.5rem)] min-h-0 overflow-hidden">
          <CanvasAgente
            run={run}
            steps={steps}
            tipoLabel={campaign.name}
            eventos={eventos}
            campanaId={campaign.id}
            budget={budget ?? undefined}
          />
        </div>
      ) : (
        <div className="flex h-[calc(100svh-7.5rem)] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          Esta campaña todavía no tiene borradores. Lánzala desde Agentes.
        </div>
      )}
    </div>
  );
}
