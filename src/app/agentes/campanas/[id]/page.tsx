"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PillBadge } from "@/components/pill-badge";
import { useConfirm } from "@/components/confirm-provider";
import { ArrowLeft2 } from "@/lib/icons";
import { AgentRun, AgentStep, mapearAgentRun, mapearAgentStep } from "@/lib/agentes";
import { Campaign, CAMPAIGN_STATUS_LABEL, CAMPAIGN_STATUS_COLOR } from "@/lib/campanas";
import { TrazaAgente } from "../../[agentType]/[runId]/traza-agente";
import { CanvasAgente } from "../../[agentType]/[runId]/canvas-agente";

export default function CampanaDetallePage() {
  const params = useParams<{ id: string }>();
  const confirmar = useConfirm();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [aprobados, setAprobados] = useState(0);

  const cargar = useCallback(async () => {
    try {
      const c = await fetch(`/api/agentes/campanas/${params.id}`).then((r) => r.json());
      if (c.ok) {
        setCampaign(c.campaign as Campaign);
        setRunId(c.runId ?? null);
      }
      if (c.ok && c.runId) {
        const [rr, ll] = await Promise.all([
          fetch(`/api/agentes/runs/${c.runId}`).then((r) => r.json()),
          fetch(`/api/agentes/runs/${c.runId}/leads`).then((r) => r.json()),
        ]);
        if (rr.ok) {
          setRun(mapearAgentRun(rr.run));
          setSteps((rr.steps as Parameters<typeof mapearAgentStep>[0][]).map(mapearAgentStep));
        }
        if (ll.ok) {
          setAprobados((ll.leads as { message_status?: string }[]).filter((x) => x.message_status === "approved").length);
        }
      }
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

  async function dispatch() {
    const ok = await confirmar("¿Enviar los borradores aprobados?", { titulo: "Enviar" });
    if (!ok) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/agentes/campanas/${params.id}/dispatch`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error");
      toast.success(
        data.configured
          ? `Enviados: ${data.dispatched}${data.failed ? `, fallidos: ${data.failed}` : ""}`
          : data.note || "Envío no configurado todavía",
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
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!campaign) return <p className="text-sm text-muted-foreground">Campaña no encontrada.</p>;

  const col = CAMPAIGN_STATUS_COLOR[campaign.status];

  return (
    <div className="flex h-[calc(100svh-6.5rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Link href="/agentes/campanas" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft2 className="size-3" /> Campañas
        </Link>
        <div className="flex items-center gap-2">
          <PillBadge bg={col.bg} color={col.color} className="text-[11px]">{CAMPAIGN_STATUS_LABEL[campaign.status]}</PillBadge>
          {campaign.status === "draft" && (
            <Button size="sm" onClick={lanzar} disabled={enviando}>Lanzar campaña</Button>
          )}
          {aprobados > 0 && (
            <Button size="sm" variant="outline" onClick={dispatch} disabled={enviando}>
              <Send className="size-4" /> Enviar ({aprobados})
            </Button>
          )}
        </div>
      </div>

      {/* Traza + canvas — misma interfaz que el detalle de run */}
      {run && runId ? (
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          <TrazaAgente
            run={run}
            steps={steps}
            tipoLabel={campaign.name}
            agentType="campaign_pipeline"
            onActualizado={cargar}
          />
          <CanvasAgente run={run} steps={steps} tipoLabel={campaign.name} />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          {campaign.status === "draft" ? "Pulsa «Lanzar campaña» para empezar." : "Preparando la ejecución…"}
        </div>
      )}
    </div>
  );
}
