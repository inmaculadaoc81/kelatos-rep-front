"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, EstadoDepartamentoBadge, Kpi, ProximasEjecuciones, TablaRuns, Vacio } from "@/components/agentes-v2/componentes";
import { type DetalleDepartamento, type EstadoDepartamento } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";
import { PestanaAnalitica, PestanaEstrategia, PestanaHorario } from "./bloques-departamento";
import { SeoPanel } from "./seo-panel";


function PestanaResumen({ d, recargar}: { d: DetalleDepartamento; recargar: () => void }) {
  const [guardando, setGuardando] = useState(false);
  const cambiarEstado = async (status: EstadoDepartamento) => {
    setGuardando(true);
    try {
      await enviarV2("PATCH", `departments/${d.department.key}`, { status });
      toast.success(status === "active" ? "Departamento activado" : status === "paused" ? "Departamento en pausa" : "Estado actualizado");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setGuardando(false);
    }
  };
  const ejecutarAhora = async () => {
    setGuardando(true);
    try {
      const r = await enviarV2<{ ok: boolean; orchestrator_active: boolean }>("POST", `departments/${d.department.key}/run`, {});
      if (r.orchestrator_active) toast.success("Ejecución lanzada");
      else toast.info("Ejecución en cola. El orquestador está apagado, así que no se ejecutará hasta activarlo.");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo lanzar la ejecución");
    } finally {
      setGuardando(false);
    }
  };
  const c = d.settings.configuration;
  const estado = d.department.status;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Estado" valor={estado === "active" ? "Activo" : estado === "paused" ? "En pausa" : estado === "disabled" ? "Desactivado" : "En preparación"} sub={d.department.description} />
        <Kpi titulo="Horarios" valor={String(d.schedules.filter((s) => s.enabled).length)} sub="activos" />
        <Kpi titulo="Workflows" valor={String(d.workflows.length)} sub="definidos" />
        <Kpi titulo="Agentes" valor={String(d.agents.length)} sub="asignados" />
      </div>
      <div className="flex flex-wrap gap-2">
        {estado !== "active" && <Button size="sm" disabled={guardando} onClick={() => cambiarEstado("active")}>Activar</Button>}
        {estado === "active" && <Button size="sm" variant="outline" disabled={guardando} onClick={() => cambiarEstado("paused")}>Pausar</Button>}
        {estado !== "disabled" && <Button size="sm" variant="ghost" disabled={guardando} onClick={() => cambiarEstado("disabled")}>Desactivar</Button>}
        {estado !== "disabled" && <Button size="sm" variant="outline" className="ml-auto" disabled={guardando} onClick={ejecutarAhora}>Ejecutar ahora</Button>}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Objetivo actual</h2>
          {c.goals && c.goals.length ? (
            <ul className="list-disc space-y-1 rounded-lg border p-4 pl-8 text-sm">{c.goals.map((g) => <li key={g}>{g}</li>)}</ul>
          ) : (
            <Vacio titulo="Sin objetivos definidos" texto="Defínelos en la pestaña Estrategia o pídeselos al AI CMO cuando esté disponible." />
          )}
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Próximas ejecuciones</h2>
          <ProximasEjecuciones items={d.upcoming} />
        </section>
      </div>
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        La lógica específica de este departamento todavía no está implementada: se conectará a este marco en una fase posterior sin cambiar el núcleo.
      </p>
    </div>
  );
}

function PestanaWorkflows({ d }: { d: DetalleDepartamento }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Workflows</h2>
        {d.workflows.length === 0 ? (
          <Vacio titulo="Sin workflows" texto="Un workflow es la secuencia de pasos de un departamento (por ejemplo: investigar, redactar, validar, aprobar, publicar). Se definirán al implementar el departamento." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d.workflows.map((w) => (
              <div key={w.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{w.name}</p>
                  <span className={cn("text-xs", w.enabled ? "text-green-700" : "text-muted-foreground")}>{w.enabled ? "Activo" : "Desactivado"}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{w.description || "Sin descripción"}</p>
                <p className="mt-2 text-xs text-muted-foreground">{w.definition.stages?.length ?? 0} pasos</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Agentes asignados</h2>
        {d.agents.length === 0 ? (
          <Vacio titulo="Sin agentes asignados" texto="Un departamento puede tener uno o varios agentes, incluso repartidos entre sus workflows. Se asignarán cuando se implemente." />
        ) : (
          <ul className="divide-y rounded-lg border">
            {d.agents.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-medium">{a.agent_key}</span>
                <span className="text-muted-foreground">{a.role || "Sin rol"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function DepartamentoPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const { datos, error, cargando, recargar } = useV2<DetalleDepartamento>(`departments/${key}`);
  const [pestana, setPestana] = useState("resumen");

  if (error) return <ErrorCaja mensaje={error} />;
  if (!datos) return cargando ? <CargandoFilas /> : null;

  const cabecera = (
    <Cabecera
      titulo={datos.department.name}
      descripcion={datos.department.description}
      acciones={
        <div className="flex items-center gap-2">
          <EstadoDepartamentoBadge estado={datos.department.status} />
          <Button variant="outline" size="icon" className="size-8" onClick={() => recargar()} title="Actualizar">
            <Refresh2 className={cargando ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </div>
      }
    />
  );
  // El departamento SEO pinta su propia cabecera dentro de la mitad izquierda, para que la línea central llegue hasta arriba.
  if (datos.department.key === "local_seo") return <SeoPanel d={datos} recargar={recargar} cabecera={cabecera} />;

  return (
    <div>
      {cabecera}
      <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))}>
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="horario">Horario</TabsTrigger>
          <TabsTrigger value="estrategia">Estrategia</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="ejecuciones">Ejecuciones</TabsTrigger>
          <TabsTrigger value="analitica">Analítica</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen"><PestanaResumen d={datos} recargar={recargar} /></TabsContent>
        <TabsContent value="estrategia"><PestanaEstrategia key={datos.settings.version} d={datos} recargar={recargar} /></TabsContent>
        <TabsContent value="horario"><PestanaHorario d={datos} recargar={recargar} /></TabsContent>
        <TabsContent value="workflows"><PestanaWorkflows d={datos} /></TabsContent>
        <TabsContent value="ejecuciones"><TablaRuns runs={datos.runs} onAccion={async (id, a) => {
          try {
            await enviarV2("POST", `runs/${id}/${a}`, {});
            toast.success(a === "cancel" ? "Cancelación solicitada" : "Ejecución reencolada");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
          }
          recargar();
        }} /></TabsContent>
        <TabsContent value="analitica"><PestanaAnalitica d={datos} /></TabsContent>
      </Tabs>
    </div>
  );
}
