"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentRun, AgentStep } from "@/lib/agentes";
import { TrazaAgente } from "./traza-agente";

// Vista de detalle de un run — por ahora SOLO el panel de traza (cómo va
// el agente) + un contenedor vacío a la derecha reservado para más
// adelante. El resumen (coste/tokens/empresas) y la tabla de leads
// calificados se quitaron de aquí a petición del usuario, 2026-09-10 —
// van a otro lado, no se eliminó nada (esa lógica sigue en el historial
// de git, se puede recuperar cuando se decida dónde va).
//
// Ocupa la altura completa sin que la página misma haga scroll: 6.5rem
// = header del dashboard (h-14) + padding vertical de <main> (p-6, 1.5rem
// arriba y abajo). Si el panel tiene más contenido del que cabe, scrollea
// él solo (overflow-y-auto en TrazaAgente), no la página.
export default function AgenteRunDetallePage() {
  const params = useParams<{ agentType: string; runId: string }>();

  const [run, setRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipoLabel, setTipoLabel] = useState(params.agentType);

  useEffect(() => {
    fetch("/api/agentes/tipos")
      .then((r) => r.json())
      .then((data) => {
        const tipo = data.ok ? data.tipos.find((t: { type: string }) => t.type === params.agentType) : null;
        if (tipo) setTipoLabel(tipo.label);
      })
      .catch(() => {});
  }, [params.agentType]);

  async function cargar() {
    try {
      const res = await fetch(`/api/agentes/runs/${params.runId}`);
      const data = await res.json();
      if (data.ok) {
        setRun(data.run as AgentRun);
        setSteps(data.steps as AgentStep[]);
      }
    } catch {
      // silencioso — el estado de carga previo se mantiene visible
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // Refresco periódico mientras el run está en curso, para ver el
    // progreso sin recargar la página a mano.
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.runId]);

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!run) {
    return <p className="text-sm text-muted-foreground">Run no encontrado.</p>;
  }

  return (
    <div className="flex h-[calc(100svh-6.5rem)] gap-4 overflow-hidden">
      <TrazaAgente run={run} steps={steps} tipoLabel={tipoLabel} />
      <div className="h-full flex-1 rounded-xl border border-dashed" />
    </div>
  );
}
