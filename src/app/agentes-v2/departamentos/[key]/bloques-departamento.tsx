"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Add, Trash } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { enviarV2 } from "@/components/agentes-v2/use-v2";
import { Kpi, Vacio } from "@/components/agentes-v2/componentes";
import {
  DIAS_SEMANA, fechaHoraLarga,
  type ConfiguracionDepartamento, type DetalleDepartamento, type Horario,
} from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

const lista = (v: unknown): string => (Array.isArray(v) ? v.join(", ") : "");
const aLista = (t: string): string[] => t.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

export function PestanaEstrategia({ d, recargar, modo }: { d: DetalleDepartamento; recargar: () => void; modo?: "seo" }) {
  const seo = modo === "seo";
  const campos = new Set(seo ? ["targetAudience", "topics", "tone", "goals"] : d.department.config_schema.fields ?? ["targetAudience", "topics", "goals", "tone", "frequency", "channels"]);
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
          <Label htmlFor="aud">{seo ? "Público al que van dirigidos los artículos" : "Audiencia objetivo"}</Label>
          <Input id="aud" value={audiencia} onChange={(e) => setAudiencia(e.target.value)} placeholder="Por ejemplo: clínicas privadas" />
          {seo && <p className="text-xs text-muted-foreground">Se usa para elegir temas y para escribir. Ejemplo: «clínicas y negocios de servicios en España».</p>}
        </div>
      )}
      {campos.has("goals") && (
        <div className="space-y-1.5">
          <Label htmlFor="obj">{seo ? "Objetivos (solo informativos)" : "Objetivos"}</Label>
          <Textarea id="obj" value={objetivos} onChange={(e) => setObjetivos(e.target.value)} rows={2} placeholder="Separados por comas" />
          {seo && <p className="text-xs text-muted-foreground">No cambian lo que busca ni lo que escribe; solo recuerdan la intención del departamento.</p>}
        </div>
      )}
      {campos.has("topics") && (
        <div className="space-y-1.5">
          <Label htmlFor="temas">{seo ? "Temas que buscará el investigador" : "Temas"}</Label>
          <Textarea id="temas" value={temas} onChange={(e) => setTemas(e.target.value)} rows={2} placeholder="Separados por comas: WhatsApp, automatización, reservas" />
          {seo && <p className="text-xs text-muted-foreground">El investigador parte de estos temas para proponer ideas nuevas y buscar noticias del sector. Se aplica en la próxima búsqueda.</p>}
        </div>
      )}
      {campos.has("tone") && (
        <div className="space-y-1.5">
          <Label htmlFor="tono">{seo ? "Tono de redacción" : "Tono"}</Label>
          <Input id="tono" value={tono} onChange={(e) => setTono(e.target.value)} placeholder="Cercano, profesional…" />
          {seo && <p className="text-xs text-muted-foreground">El redactor lo aplica en todos los artículos nuevos.</p>}
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
          Versión {d.settings.version}{d.settings.updated_at ? ` · ${fechaHoraLarga(d.settings.updated_at)}` : ""}{d.settings.updated_by ? ` · ${d.settings.updated_by}` : ""}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{seo ? "Los cambios se aplican en la siguiente búsqueda o artículo. Los días, las horas y los topes por semana se cambian en Horario." : "Esta configuración es la que leerán los workflows en cada ejecución. El AI CMO también puede proponer cambios aquí, y solo se aplican con tu aprobación."}</p>
    </div>
  );
}

export function PestanaHorario({ d, recargar }: { d: DetalleDepartamento; recargar: () => void }) {
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
          <p className="text-xs text-muted-foreground">Lanza: {d.workflows.find((w) => String(w.id) === String(h.workflow_id))?.name ?? "—"} · Zona horaria: {h.timezone}</p>
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

export function PestanaAnalitica({ d }: { d: DetalleDepartamento }) {
  if (!d.metrics.length) return <Vacio titulo="Sin métricas todavía" texto="Las métricas propias de este departamento (tráfico, alcance, conversiones…) aparecerán aquí cuando existan." />;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {d.metrics.map((m) => <Kpi key={m.metric} titulo={m.metric} valor={`${m.value.toLocaleString("es-ES")}${m.unit ? ` ${m.unit}` : ""}`} sub={fechaHoraLarga(m.recorded_at)} />)}
    </div>
  );
}

