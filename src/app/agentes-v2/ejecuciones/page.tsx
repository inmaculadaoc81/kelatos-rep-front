"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, TablaRuns } from "@/components/agentes-v2/componentes";
import type { RunFila } from "@/lib/agentes-v2";

/** Historial de ejecuciones de todos los departamentos (cada disparo de un horario = una ejecución). */
export default function EjecucionesPage() {
  const { datos, error, cargando, recargar } = useV2<{ ok: boolean; runs: RunFila[] }>("runs?limit=100");
  const hayVivas = !!datos?.runs.some((r) => r.status === "queued" || r.status === "running");
  useEffect(() => {
    if (!hayVivas) return;
    const t = setInterval(recargar, 5000);
    return () => clearInterval(t);
  }, [hayVivas, recargar]);
  const accion = async (id: string, a: "cancel" | "retry") => {
    try {
      await enviarV2("POST", `runs/${id}/${a}`, {});
      toast.success(a === "cancel" ? "Cancelación solicitada" : "Ejecución reencolada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
    }
    recargar();
  };
  return (
    <div>
      <Cabecera titulo="Ejecuciones" descripcion="Cada vez que un horario se dispara se registra una ejecución con su duración, resultado y coste de IA." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? <CargandoFilas /> : <TablaRuns runs={datos?.runs ?? []} conDepartamento onAccion={accion} />}
    </div>
  );
}
