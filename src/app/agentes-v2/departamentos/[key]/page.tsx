"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Add, Refresh2, Trash } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, EstadoDepartamentoBadge, Kpi, ProximasEjecuciones, TablaRuns, Vacio } from "@/components/agentes-v2/componentes";
import {
  DIAS_SEMANA, fechaHora,
  type ConfiguracionDepartamento, type DetalleDepartamento, type EstadoDepartamento, type Horario,
} from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

const lista = (v: unknown): string => (Array.isArray(v) ? v.join(", ") : "");
const aLista = (t: string): string[] => t.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

function PestanaResumen({ d, recargar }: { d: DetalleDepartamento; recargar: () => void }) {
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

function PestanaEstrategia({ d, recargar }: { d: DetalleDepartamento; recargar: () => void }) {
  const campos = new Set(d.department.config_schema.fields ?? ["targetAudience", "topics", "goals", "tone", "frequency", "channels"]);
  const c = d.settings.configuration;
  const [audiencia, setAudiencia] = useState(c.targetAudience ?? "");
  const [temas, setTemas] = useState(lista(c.topics));
  const [objetivos, setObjetivos] = useState(lista(c.goals));
  const [tono, setTono] = useState(c.tone ?? "");
  const [frecuencia, setFrecuencia] = useState(c.frequency != null ? String(c.frequency) : "");
  const [canales, setCanales] = useState(lista(c.channels));
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      const conf: ConfiguracionDepartamento = { ...c };
      if (campos.has("targetAudience")) conf.targetAudience = audiencia.trim();
      if (campos.has("topics")) conf.topics = aLista(temas);
      if (campos.has("goals")) conf.goals = aLista(objetivos);
      if (campos.has("tone")) conf.tone = tono.trim();
      if (campos.has("frequency")) conf.frequency = frecuencia.trim() === "" ? null : Number(frecuencia);
      if (campos.has("channels")) conf.channels = aLista(canales);
      if (conf.frequency != null && (!Number.isFinite(conf.frequency) || conf.frequency < 0)) throw new Error("La frecuencia debe ser un número positivo");
      await enviarV2("PUT", `departments/${d.department.key}/settings`, { configuration: conf });
      toast.success("Estrategia guardada");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {campos.has("targetAudience") && (
        <div className="space-y-1.5">
          <Label htmlFor="aud">Audiencia objetivo</Label>
          <Input id="aud" value={audiencia} onChange={(e) => setAudiencia(e.target.value)} placeholder="Por ejemplo: clínicas privadas" />
        </div>
      )}
      {campos.has("goals") && (
        <div className="space-y-1.5">
          <Label htmlFor="obj">Objetivos</Label>
          <Textarea id="obj" value={objetivos} onChange={(e) => setObjetivos(e.target.value)} rows={2} placeholder="Separados por comas" />
        </div>
      )}
      {campos.has("topics") && (
        <div className="space-y-1.5">
          <Label htmlFor="temas">Temas</Label>
          <Textarea id="temas" value={temas} onChange={(e) => setTemas(e.target.value)} rows={2} placeholder="Separados por comas: WhatsApp, automatización, reservas" />
        </div>
      )}
      {campos.has("tone") && (
        <div className="space-y-1.5">
          <Label htmlFor="tono">Tono</Label>
          <Input id="tono" value={tono} onChange={(e) => setTono(e.target.value)} placeholder="Cercano, profesional…" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {campos.has("frequency") && (
          <div className="space-y-1.5">
            <Label htmlFor="frec">Frecuencia (piezas por semana)</Label>
            <Input id="frec" type="number" min={0} value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} />
          </div>
        )}
        {campos.has("channels") && (
          <div className="space-y-1.5">
            <Label htmlFor="can">Canales</Label>
            <Input id="can" value={canales} onChange={(e) => setCanales(e.target.value)} placeholder="Separados por comas" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar estrategia"}</Button>
        <span className="text-xs text-muted-foreground">
          Versión {d.settings.version}{d.settings.updated_at ? ` · ${fechaHora(d.settings.updated_at)}` : ""}{d.settings.updated_by ? ` · ${d.settings.updated_by}` : ""}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Esta configuración es la que leerán los workflows en cada ejecución. El AI CMO también puede proponer cambios aquí, y solo se aplican con tu aprobación.</p>
    </div>
  );
}

function PestanaHorario({ d, recargar }: { d: DetalleDepartamento; recargar: () => void }) {
  const [horarios, setHorarios] = useState<Horario[]>(d.schedules);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setHorarios(d.schedules), [d.schedules]);

  const cambiar = (i: number, parche: Partial<Horario>) => setHorarios((hs) => hs.map((h, j) => (j === i ? { ...h, ...parche } : h)));
  const nuevo = () => setHorarios((hs) => [...hs, { workflow_id: null, name: "", kind: "weekly", days_of_week: [1, 2, 3, 4, 5], times: ["09:00"], interval_minutes: null, timezone: "Europe/Madrid", enabled: true }]);

  const guardar = async () => {
    setGuardando(true);
    try {
      await enviarV2("PUT", `departments/${d.department.key}/schedules`, {
        schedules: horarios.map((h) => ({
          name: h.name, kind: h.kind, days_of_week: h.days_of_week, times: h.times, interval_minutes: h.kind === "interval" ? h.interval_minutes : undefined,
          timezone: h.timezone, enabled: h.enabled, workflow_id: h.workflow_id,
        })),
      });
      toast.success("Horario guardado");
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el horario");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      {horarios.length === 0 && <Vacio titulo="Sin horarios" texto="Añade un horario para que este departamento se ejecute automáticamente cuando el scheduler esté activo." />}
      {horarios.map((h, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input className="h-8 max-w-56" value={h.name} onChange={(e) => cambiar(i, { name: e.target.value })} placeholder="Nombre (opcional)" />
            <select className="h-8 rounded-md border bg-background px-2 text-sm" value={h.kind} onChange={(e) => cambiar(i, e.target.value === "interval" ? { kind: "interval", interval_minutes: h.interval_minutes ?? 60 } : { kind: "weekly" })}>
              <option value="weekly">Días y horas</option>
              <option value="interval">Cada cierto tiempo</option>
            </select>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Switch checked={h.enabled} onCheckedChange={(v) => cambiar(i, { enabled: v })} /> Activo
            </label>
            <Button variant="ghost" size="icon" className="size-8" title="Quitar horario" onClick={() => setHorarios((hs) => hs.filter((_, j) => j !== i))}>
              <Trash className="size-4" />
            </Button>
          </div>
          {h.kind === "weekly" ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map((etq, idx) => {
                  const n = idx + 1;
                  const on = h.days_of_week.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      onClick={() => cambiar(i, { days_of_week: on ? h.days_of_week.filter((x) => x !== n) : [...h.days_of_week, n].sort() })}
                      className={cn("size-8 rounded-md border text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    >
                      {etq}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {h.times.map((t, k) => (
                  <span key={k} className="flex items-center gap-1">
                    <Input type="time" className="h-8 w-28" value={t} onChange={(e) => cambiar(i, { times: h.times.map((x, m) => (m === k ? e.target.value : x)) })} />
                    {h.times.length > 1 && (
                      <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => cambiar(i, { times: h.times.filter((_, m) => m !== k) })}>quitar</button>
                    )}
                  </span>
                ))}
                <Button variant="outline" size="sm" className="h-8" onClick={() => cambiar(i, { times: [...h.times, "12:00"] })}><Add className="size-3.5" /> Hora</Button>
              </div>
            </>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              Cada
              <Input type="number" min={5} className="h-8 w-24" value={h.interval_minutes ?? ""} onChange={(e) => cambiar(i, { interval_minutes: e.target.value === "" ? null : Number(e.target.value) })} />
              minutos
            </label>
          )}
          <p className="text-xs text-muted-foreground">Zona horaria: {h.timezone}</p>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={nuevo}><Add className="size-4" /> Añadir horario</Button>
        <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar horario"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Solo se lanzan los horarios de departamentos <strong>activos</strong>, y solo cuando el scheduler está encendido (Ajustes muestra su estado).</p>
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

function PestanaAnalitica({ d }: { d: DetalleDepartamento }) {
  if (!d.metrics.length) return <Vacio titulo="Sin métricas todavía" texto="Las métricas propias de este departamento (tráfico, alcance, conversiones…) aparecerán aquí cuando existan." />;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {d.metrics.map((m) => <Kpi key={m.metric} titulo={m.metric} valor={`${m.value.toLocaleString("es-ES")}${m.unit ? ` ${m.unit}` : ""}`} sub={fechaHora(m.recorded_at)} />)}
    </div>
  );
}

export default function DepartamentoPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const { datos, error, cargando, recargar } = useV2<DetalleDepartamento>(`departments/${key}`);

  if (error) return <ErrorCaja mensaje={error} />;
  if (!datos) return cargando ? <CargandoFilas /> : null;

  return (
    <div>
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
      <Tabs defaultValue="resumen">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="estrategia">Estrategia</TabsTrigger>
          <TabsTrigger value="horario">Horario</TabsTrigger>
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
