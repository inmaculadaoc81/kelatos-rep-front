"use client";

import { AgentRun, AgentStep } from "@/lib/agentes";
import { Oportunidades, PanelOportunidades } from "../pr-oportunidades-componentes";

/** Canvas del run de Oportunidades de PR: el mismo panel de categorías
    del dashboard principal, pero fijado a ESTE run concreto (no al
    último completado). */
export function CanvasPrOportunidades({ steps }: { run: AgentRun; steps: AgentStep[]; tipoLabel: string }) {
  const oportunidades = steps.find((p) => p.step === "oportunidades")?.output as Oportunidades | undefined;

  return (
    <div className="min-w-0 flex-1 space-y-3 overflow-y-auto rounded-xl bg-white p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Resultado de esta búsqueda</h2>
      <PanelOportunidades oportunidades={oportunidades} />
    </div>
  );
}
