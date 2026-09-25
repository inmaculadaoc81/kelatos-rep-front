"use client";

import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Kpi } from "@/components/agentes-v2/componentes";

interface Sistema {
  ok: boolean;
  departments: number;
  schedules: number;
  workflows: number;
  agents: number;
  scheduler: { active: boolean; note: string };
  cmo: { active: boolean };
}

/** Estado del sistema. Los permisos son fijos en esta fase: solo administradores entran; el AI CMO propondrá y un humano aprueba. */
export default function AjustesPage() {
  const { datos, error, cargando } = useV2<Sistema>("system");
  return (
    <div>
      <Cabecera titulo="Ajustes" descripcion="Estado general del sistema de marketing." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={2} />
      ) : datos ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Departamentos" valor={String(datos.departments)} />
            <Kpi titulo="Horarios activos" valor={String(datos.schedules)} />
            <Kpi titulo="Workflows" valor={String(datos.workflows)} />
            <Kpi titulo="Agentes asignados" valor={String(datos.agents)} />
          </div>
          <ul className="divide-y rounded-lg border text-sm">
            <li className="flex justify-between gap-3 px-4 py-3"><span>Scheduler</span><span className="text-muted-foreground">{datos.scheduler.active ? "Activo" : "Apagado"} — {datos.scheduler.note}</span></li>
            <li className="flex justify-between gap-3 px-4 py-3"><span>AI CMO</span><span className="text-muted-foreground">{datos.cmo.active ? "Activo" : "Aún no disponible (fase C)"}</span></li>
            <li className="flex justify-between gap-3 px-4 py-3"><span>Acceso</span><span className="text-muted-foreground">Solo administradores</span></li>
            <li className="flex justify-between gap-3 px-4 py-3"><span>Cambios de estrategia</span><span className="text-muted-foreground">Los propone el AI CMO y los aprueba una persona</span></li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
