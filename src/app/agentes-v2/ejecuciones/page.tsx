"use client";

import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, TablaRuns } from "@/components/agentes-v2/componentes";
import type { RunFila } from "@/lib/agentes-v2";

/** Historial de ejecuciones de todos los departamentos (cada disparo de un horario = una ejecución). */
export default function EjecucionesPage() {
  const { datos, error, cargando } = useV2<{ ok: boolean; runs: RunFila[] }>("runs?limit=100");
  return (
    <div>
      <Cabecera titulo="Ejecuciones" descripcion="Cada vez que un horario se dispara se registra una ejecución con su duración, resultado y coste de IA." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? <CargandoFilas /> : <TablaRuns runs={datos?.runs ?? []} conDepartamento />}
    </div>
  );
}
