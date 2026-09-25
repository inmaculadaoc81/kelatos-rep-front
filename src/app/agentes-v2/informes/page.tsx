"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { enviarV2, useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { DIAS_SEMANA, fechaHora } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Horario {
  kind: "weekly";
  days_of_week: number[];
  times: string[];
  timezone: string;
}

interface Informe {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  schedule: Horario | null;
  next_run_at: string | null;
  last_run_at: string | null;
  department_name: string | null;
  generator_available: boolean;
  config: { period_days?: number };
  last_run: { id: string; status: string; created_at: string; error: string | null } | null;
}

interface Ejecucion {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  period_start: string | null;
  period_end: string | null;
  error: string | null;
  created_by: string | null;
  created_at: string;
}

interface Salida {
  title: string;
  generated_at: string;
  period: { start: string; end: string; days: number };
  sections: { title: string; kpis?: { label: string; value: string | number; unit?: string }[]; table?: { columns: string[]; rows: (string | number)[][] } }[];
}

const PERIODOS = [7, 14, 30, 90];
const ETIQUETA_ESTADO = { queued: "En cola", running: "Generando", completed: "Listo", failed: "Falló" } as const;
const COLOR_ESTADO = { queued: "text-slate-600", running: "text-blue-700", completed: "text-green-700", failed: "text-red-700" } as const;

function textoHorario(h: Horario | null): string {
  if (!h) return "Sin programar";
  const dias = h.days_of_week.length === 7 ? "todos los días" : h.days_of_week.map((d) => DIAS_SEMANA[d - 1]).join(", ");
  return `${dias} a las ${h.times.join(", ")}`;
}

function Resultado({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const { datos, error, cargando } = useV2<{ ok: boolean; run: { status: string; output: Salida | null; error: string | null; name: string; created_at: string } }>(`reports/runs/${id}`);
  const salida = datos?.run.output;
  return (
    <Dialog open onOpenChange={(a) => { if (!a) onCerrar(); }}>
      <DialogContent className="flex max-h-[88vh] flex-col overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{salida?.title ?? datos?.run.name ?? "Informe"}</DialogTitle>
          <DialogDescription>
            {salida ? `Del ${new Date(salida.period.start).toLocaleDateString("es-ES")} al ${new Date(salida.period.end).toLocaleDateString("es-ES")} · generado ${fechaHora(salida.generated_at)}` : "Cargando…"}
          </DialogDescription>
        </DialogHeader>
        {error && <ErrorCaja mensaje={error} />}
        {cargando && !datos && <CargandoFilas n={3} />}
        {datos?.run.error && <ErrorCaja mensaje={datos.run.error} />}
        {salida && (
          <div className="space-y-6 text-sm">
            {salida.sections.map((s) => (
              <section key={s.title}>
                <h3 className="mb-2 font-medium">{s.title}</h3>
                {s.kpis && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {s.kpis.map((k) => (
                      <div key={k.label} className="rounded-md border p-2.5">
                        <p className="text-[11px] text-muted-foreground">{k.label}</p>
                        <p className="mt-0.5 text-lg leading-tight font-semibold tabular-nums">{typeof k.value === "number" ? k.value.toLocaleString("es-ES") : k.value}{k.unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{k.unit}</span> : null}</p>
                      </div>
                    ))}
                  </div>
                )}
                {s.table && (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>{s.table.columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.table.rows.map((fila, i) => (
                          <TableRow key={i}>{fila.map((v, j) => <TableCell key={j} className="text-sm">{typeof v === "number" ? v.toLocaleString("es-ES") : v}</TableCell>)}</TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Historial({ clave, recarga, onVer }: { clave: string; recarga: number; onVer: (id: string) => void }) {
  const { datos, cargando } = useV2<{ ok: boolean; runs: Ejecucion[] }>(`reports/${clave}/runs?limit=8&r=${recarga}`);
  if (cargando && !datos) return <p className="text-xs text-muted-foreground">Cargando historial…</p>;
  if (!datos || datos.runs.length === 0) return <p className="text-xs text-muted-foreground">Todavía no se ha generado ninguno.</p>;
  return (
    <ul className="divide-y rounded-md border text-xs">
      {datos.runs.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="tabular-nums">{fechaHora(r.created_at)}</span>
          <span className="text-muted-foreground">{r.created_by === "programado" ? "Programado" : r.created_by ?? ""}</span>
          <span className={cn("font-medium", COLOR_ESTADO[r.status])} title={r.error || undefined}>{ETIQUETA_ESTADO[r.status]}</span>
          {r.status === "completed" ? <button type="button" className="text-primary hover:underline" onClick={() => onVer(r.id)}>Ver</button> : <span className="w-6" />}
        </li>
      ))}
    </ul>
  );
}

function TarjetaInforme({ r, onVer, onCambio }: { r: Informe; onVer: (id: string) => void; onCambio: () => void }) {
  const [dias, setDias] = useState(String(r.config.period_days ?? 7));
  const [generando, setGenerando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [diasSem, setDiasSem] = useState<number[]>(r.schedule?.days_of_week ?? [1]);
  const [hora, setHora] = useState(r.schedule?.times[0] ?? "08:00");
  const [recarga, setRecarga] = useState(0);

  const generar = async () => {
    setGenerando(true);
    try {
      const res = await enviarV2<{ ok: boolean; run: { id: string; status: string; error: string | null } }>("POST", `reports/${r.key}/run`, { days: Number(dias) });
      if (res.run.status === "completed") {
        toast.success("Informe generado");
        onVer(res.run.id);
      } else {
        toast.error(res.run.error || "No se pudo generar el informe");
      }
      setRecarga((n) => n + 1);
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el informe");
    } finally {
      setGenerando(false);
    }
  };

  const configurar = async (parche: { enabled?: boolean; schedule?: Partial<Horario> | null }) => {
    try {
      await enviarV2("PATCH", `reports/${r.key}`, parche);
      onCambio();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      return false;
    }
  };

  return (
    <article className="rounded-lg border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.department_name ?? "Todo el sistema"} · {textoHorario(r.schedule)}{r.schedule && r.enabled && r.next_run_at ? ` · próximo: ${fechaHora(r.next_run_at)}` : ""}</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={r.enabled} onCheckedChange={(v) => configurar({ enabled: v })} /> {r.enabled ? "Activo" : "Desactivado"}
        </label>
      </header>
      <div className="space-y-3 px-4 py-3">
        {!r.generator_available && <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">Este informe todavía no tiene contenido: se activará al implementar su departamento.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={dias} onChange={(e) => setDias(e.target.value)} aria-label="Periodo">
            {PERIODOS.map((p) => <option key={p} value={p}>Últimos {p} días</option>)}
          </select>
          <Button size="sm" onClick={generar} disabled={generando || !r.generator_available}>{generando ? "Generando…" : "Generar ahora"}</Button>
          <Button size="sm" variant="outline" onClick={() => setEditando((v) => !v)}>{r.schedule ? "Cambiar programación" : "Programar"}</Button>
          {r.schedule && <Button size="sm" variant="ghost" onClick={async () => { if (await configurar({ schedule: null })) toast.success("Programación quitada"); }}>Quitar</Button>}
        </div>
        {editando && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA.map((etq, i) => {
                const n = i + 1;
                const on = diasSem.includes(n);
                return (
                  <button key={n} type="button" aria-pressed={on} onClick={() => setDiasSem(on ? diasSem.filter((x) => x !== n) : [...diasSem, n].sort())} className={cn("size-8 rounded-md border text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    {etq}
                  </button>
                );
              })}
              <Input type="time" className="h-8 w-28" value={hora} onChange={(e) => setHora(e.target.value)} />
              <Button size="sm" className="h-8" onClick={async () => { if (await configurar({ schedule: { days_of_week: diasSem, times: [hora] } })) { toast.success("Programación guardada"); setEditando(false); } }}>Guardar</Button>
            </div>
            <p className="text-xs text-muted-foreground">Zona horaria de Madrid. Los informes programados se generan solos cuando el scheduler está encendido (Ajustes).</p>
          </div>
        )}
        <Historial clave={r.key} recarga={recarga} onVer={onVer} />
      </div>
    </article>
  );
}

/** Informes: cada uno tiene su definición, su historial de ejecuciones, su resultado y su programación. */
export default function InformesPage() {
  const { datos, error, cargando, recargar } = useV2<{ ok: boolean; reports: Informe[] }>("reports");
  const [viendo, setViendo] = useState<string | null>(null);
  return (
    <div>
      <Cabecera titulo="Informes" descripcion="Informes periódicos de marketing. Genéralos cuando quieras o prográmalos; cada resultado queda guardado en su historial." />
      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={2} />
      ) : !datos || datos.reports.length === 0 ? (
        <Vacio titulo="Sin informes definidos" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {datos.reports.map((r) => <TarjetaInforme key={r.key} r={r} onVer={setViendo} onCambio={recargar} />)}
        </div>
      )}
      {viendo && <Resultado id={viendo} onCerrar={() => setViendo(null)} />}
    </div>
  );
}
