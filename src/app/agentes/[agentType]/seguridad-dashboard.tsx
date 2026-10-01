"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentRun, AgentStep } from "@/lib/agentes";
import { Refresh2 } from "@/lib/icons";
import { ResumenAccesos, ResumenInfra, ResumenNpmAudit, TarjetaAccesos, TarjetaInfra, TarjetaNpm } from "./seguridad-componentes";

/** Panel del agente de Auditoría de seguridad: 4 tarjetas con el resultado
    del último run completado + botón para lanzar uno nuevo a mano. Lee los
    pasos del run más reciente vía GET /api/agentes/runs/:id (misma ruta que
    usa la vista de detalle) — sin endpoint propio nuevo. */
export function SeguridadDashboard({ runs, cargando, onEjecutado }: { runs: AgentRun[]; cargando: boolean; onEjecutado: () => void }) {
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

  const pasoPor = (step: string) => pasos?.find((p) => p.step === step && p.status === "completed")?.output as unknown;

  async function ejecutarAhora() {
    setEjecutando(true);
    try {
      const res = await fetch("/api/agentes/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: "security_audit", goal: "Auditoría manual de seguridad", input: {} }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Auditoría lanzada — tarda unos segundos");
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
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            {ultimoCompletado ? `Última auditoría: ${new Date(ultimoCompletado.finishedAt || ultimoCompletado.createdAt).toLocaleString("es-ES")}` : "Todavía no se ha ejecutado ninguna auditoría"}
          </h2>
        </div>
        <Button size="sm" disabled={ejecutando || corriendoAhora} onClick={ejecutarAhora} className="gap-1.5">
          <Refresh2 className={corriendoAhora ? "size-4 animate-spin" : "size-4"} />
          {corriendoAhora ? "Ejecutando…" : "Ejecutar auditoría ahora"}
        </Button>
      </div>

      {cargando || cargandoPasos ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaNpm titulo="Dependencias · Backend" r={pasoPor("npm_audit_backend") as ResumenNpmAudit | undefined} />
          <TarjetaNpm titulo="Dependencias · Frontend" r={pasoPor("npm_audit_frontend") as ResumenNpmAudit | undefined} />
          <TarjetaAccesos r={pasoPor("accesos_permisos") as ResumenAccesos | undefined} />
          <TarjetaInfra r={pasoPor("infra_vps") as ResumenInfra | undefined} />
        </div>
      )}
      {ultimoCompletado && (
        <p className="text-xs text-muted-foreground">
          <Link href={`/agentes/security_audit/${ultimoCompletado.id}`} className="text-primary underline-offset-2 hover:underline">Ver el detalle paso a paso →</Link>
        </p>
      )}
    </div>
  );
}
