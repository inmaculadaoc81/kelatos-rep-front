"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentRun, AgentStep } from "@/lib/agentes";
import { Refresh2 } from "@/lib/icons";
import { Oportunidades, PanelOportunidades } from "./pr-oportunidades-componentes";

/** Panel del agente de Oportunidades de PR: mismo patrón que
    VideoSeoDashboard — lee los pasos del último run completado vía
    GET /api/agentes/runs/:id y muestra el panel de categorías. */
export function PrOportunidadesDashboard({ runs, cargando, onEjecutado }: { runs: AgentRun[]; cargando: boolean; onEjecutado: () => void }) {
  const [pasos, setPasos] = useState<AgentStep[] | null>(null);
  const [cargandoPasos, setCargandoPasos] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);

  const ultimoCompletado = runs.find((r) => r.status === "completed") ?? null;

  useEffect(() => {
    if (!ultimoCompletado) {
      setPasos(null);
      setCargandoPasos(false);
      return;
    }
    setCargandoPasos(true);
    fetch(`/api/agentes/runs/${ultimoCompletado.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setPasos(data.steps as AgentStep[]); })
      .catch(() => {})
      .finally(() => setCargandoPasos(false));
  }, [ultimoCompletado?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const oportunidades = pasos?.find((p) => p.step === "oportunidades" && p.status === "completed")?.output as Oportunidades | undefined;

  async function ejecutarAhora() {
    setEjecutando(true);
    try {
      const res = await fetch("/api/agentes/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: "pr_opportunities", goal: "Búsqueda manual de oportunidades de PR", input: {} }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Búsqueda lanzada — puede tardar un minuto");
      setTimeout(onEjecutado, 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEjecutando(false);
    }
  }

  const corriendoAhora = runs.some((r) => r.status === "queued" || r.status === "running");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {ultimoCompletado ? `Última búsqueda: ${new Date(ultimoCompletado.finishedAt || ultimoCompletado.createdAt).toLocaleString("es-ES")}` : "Todavía no se ha ejecutado ninguna búsqueda"}
        </h2>
        <Button size="sm" disabled={ejecutando || corriendoAhora} onClick={ejecutarAhora} className="gap-1.5">
          <Refresh2 className={corriendoAhora ? "size-4 animate-spin" : "size-4"} />
          {corriendoAhora ? "Buscando…" : "Buscar oportunidades ahora"}
        </Button>
      </div>

      {cargando || cargandoPasos ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (
        <PanelOportunidades oportunidades={oportunidades} />
      )}

      {ultimoCompletado && (
        <p className="text-xs text-muted-foreground">
          <Link href={`/agentes/pr_opportunities/${ultimoCompletado.id}`} className="text-primary underline-offset-2 hover:underline">Ver el detalle paso a paso →</Link>
        </p>
      )}
    </div>
  );
}
