"use client";

import { AgentRun, AgentStep } from "@/lib/agentes";
import { ResumenAccesos, ResumenInfra, ResumenNpmAudit, TarjetaAccesos, TarjetaInfra, TarjetaNpm } from "../seguridad-componentes";

/** Canvas del run de Auditoría de seguridad: las mismas 4 tarjetas del
    panel principal, pero fijadas a ESTE run concreto (no al último
    completado) — para revisar una auditoría pasada tal como quedó. */
export function CanvasSeguridad({ steps }: { run: AgentRun; steps: AgentStep[]; tipoLabel: string }) {
  const pasoPor = (step: string) => steps.find((p) => p.step === step)?.output as unknown;

  return (
    <div className="min-w-0 flex-1 space-y-3 overflow-y-auto rounded-xl bg-white p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Resultado de esta auditoría</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <TarjetaNpm titulo="Dependencias · Backend" r={pasoPor("npm_audit_backend") as ResumenNpmAudit | undefined} />
        <TarjetaNpm titulo="Dependencias · Frontend" r={pasoPor("npm_audit_frontend") as ResumenNpmAudit | undefined} />
        <TarjetaAccesos r={pasoPor("accesos_permisos") as ResumenAccesos | undefined} />
        <TarjetaInfra r={pasoPor("infra_vps") as ResumenInfra | undefined} />
      </div>
    </div>
  );
}
