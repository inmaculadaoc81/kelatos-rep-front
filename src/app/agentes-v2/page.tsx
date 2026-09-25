"use client";

import Link from "next/link";
import { Cpu, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Kpi, ProximasEjecuciones, TarjetaDepartamento, TablaRuns } from "@/components/agentes-v2/componentes";
import { usd, type Panel } from "@/lib/agentes-v2";

/** Panel de Marketing: estado de los departamentos, próximas ejecuciones, aprobaciones, costes y actividad. */
export default function PanelMarketingPage() {
  const { datos, error, cargando, recargar } = useV2<Panel>("overview");
  const activos = datos?.departments.filter((d) => d.status === "active").length ?? 0;
  const gasto = datos?.costs.ad_spend_30d ?? [];

  return (
    <div>
      <Cabecera
        titulo="Marketing"
        descripcion="Un departamento de marketing completo operado en parte por IA. Cada departamento tiene su estrategia, su horario y sus ejecuciones."
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={() => recargar()} title="Actualizar">
            <Refresh2 className={cargando ? "size-4 animate-spin" : "size-4"} />
          </Button>
        }
      />
      {error && <ErrorCaja mensaje={error} />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Departamentos activos" valor={`${activos} de ${datos?.departments.length ?? 0}`} sub="los demás siguen en preparación" cargando={cargando && !datos} />
        <Kpi titulo="Aprobaciones pendientes" valor={String(datos?.pending_approvals ?? 0)} sub="esperan una decisión humana" cargando={cargando && !datos} />
        <Kpi titulo="Coste de IA (30 días)" valor={usd(datos?.costs.agent_cost_usd_30d ?? 0)} sub="lo que cuestan los agentes" cargando={cargando && !datos} />
        <Kpi
          titulo="Inversión en anuncios (30 días)"
          valor={gasto.length ? gasto.map((g) => `${g.total.toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${g.currency}`).join(" · ") : "0 €"}
          sub="dinero pagado a plataformas, aparte del coste de IA"
          cargando={cargando && !datos}
        />
      </div>

      <section className="mb-6 rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Cpu className="size-5" /></span>
            <div>
              <p className="text-sm font-medium">AI CMO</p>
              <p className="text-sm text-muted-foreground">Pídele cambios de estrategia con tus palabras: prepara una propuesta y no se aplica nada hasta que la apruebes.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/agentes-v2/cmo" />}>Abrir AI CMO</Button>
        </div>
      </section>

      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Departamentos</h2>
      {cargando && !datos ? (
        <CargandoFilas n={3} />
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {datos?.departments.map((d) => <TarjetaDepartamento key={d.key} d={d} />)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Próximas ejecuciones</h2>
          <ProximasEjecuciones items={datos?.upcoming ?? []} />
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Actividad reciente</h2>
          <TablaRuns runs={datos?.recent_runs ?? []} conDepartamento />
        </section>
      </div>
    </div>
  );
}
