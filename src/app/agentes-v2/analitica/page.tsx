"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { Cabecera, CargandoFilas, ErrorCaja, Kpi, Vacio } from "@/components/agentes-v2/componentes";
import { fechaHora, usd } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";

interface Actividad {
  ok: boolean;
  days: number;
  by_day: { day: string; runs_completed: number; runs_failed: number; approvals_decided: number; cmo_requests: number; ai_cost_usd: number }[];
  by_department: { key: string; name: string; status: string; runs: number; completed: number; failed: number; avg_seconds: number; ai_cost_usd: number; pending_approvals: number }[];
  totals: { runs: number; approvals_decided: number; strategy_changes: number; pending_approvals: number };
}

interface Metrica {
  department_key: string | null;
  department_name: string | null;
  metric: string;
  value: number;
  unit: string;
  recorded_at: string;
  change_pct: number | null;
  series: { day: string; value: number }[];
}

const PERIODOS = [7, 30, 90] as const;

const CONFIG_EJECUCIONES = {
  runs_completed: { label: "Completadas", color: "#2a9d6f" },
  runs_failed: { label: "Con error", color: "#d9534f" },
} satisfies ChartConfig;

const CONFIG_COSTE = { ai_cost_usd: { label: "Coste de IA (US$)", color: "#4f6bed" } } satisfies ChartConfig;

function Sparkline({ puntos }: { puntos: { value: number }[] }) {
  if (puntos.length < 2) return <span className="text-[11px] text-muted-foreground">Sin histórico</span>;
  const v = puntos.map((p) => p.value);
  const min = Math.min(...v);
  const max = Math.max(...v);
  const rango = max - min || 1;
  const pts = v.map((y, i) => `${(i / (v.length - 1)) * 100},${28 - ((y - min) / rango) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24" role="img" aria-label="Evolución de la métrica">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="text-primary" />
    </svg>
  );
}

/** Analítica: actividad real del sistema (ejecuciones, aprobaciones, coste de IA) y métricas que registren los departamentos. */
export default function AnaliticaPage() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [depto, setDepto] = useState("");
  const act = useV2<Actividad>(`analytics/activity?days=${dias}`);
  const met = useV2<{ ok: boolean; metrics: Metrica[] }>(`analytics/metrics?days=${dias}${depto ? `&department=${depto}` : ""}`);

  const datosGrafico = (act.datos?.by_day ?? []).map((d) => ({ ...d, etiqueta: d.day.slice(5).split("-").reverse().join("/") }));
  const hayActividad = !!act.datos && act.datos.by_day.some((d) => d.runs_completed + d.runs_failed + d.cmo_requests + d.approvals_decided > 0);
  const deptos = [...new Map((met.datos?.metrics ?? []).filter((m) => m.department_key).map((m) => [m.department_key as string, m.department_name as string])).entries()];

  return (
    <div>
      <Cabecera
        titulo="Analítica"
        descripcion="Lo que ha hecho el sistema y las métricas de cada departamento."
        acciones={
          <div className="flex gap-1.5">
            {PERIODOS.map((p) => (
              <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", dias === p ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
                {p} días
              </button>
            ))}
          </div>
        }
      />

      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Actividad del sistema</h2>
      {act.error && <ErrorCaja mensaje={act.error} />}
      {act.cargando && !act.datos ? (
        <CargandoFilas n={2} />
      ) : act.datos ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Ejecuciones" valor={String(act.datos.totals.runs)} sub={`últimos ${act.datos.days} días`} />
            <Kpi titulo="Aprobaciones decididas" valor={String(act.datos.totals.approvals_decided)} sub={`${act.datos.totals.pending_approvals} pendientes ahora`} />
            <Kpi titulo="Cambios de estrategia" valor={String(act.datos.totals.strategy_changes)} sub="aplicados desde el AI CMO" />
            <Kpi titulo="Coste de IA" valor={usd(act.datos.by_day.reduce((s, d) => s + d.ai_cost_usd, 0))} sub="agentes + AI CMO" />
          </div>
          {hayActividad ? (
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Ejecuciones por día</p>
                <ChartContainer config={CONFIG_EJECUCIONES} className="h-44 w-full">
                  <BarChart data={datosGrafico} margin={{ left: -20, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="runs_completed" stackId="a" fill="var(--color-runs_completed)" radius={[0, 0, 2, 2]} />
                    <Bar dataKey="runs_failed" stackId="a" fill="var(--color-runs_failed)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Coste de IA por día (US$)</p>
                <ChartContainer config={CONFIG_COSTE} className="h-44 w-full">
                  <BarChart data={datosGrafico} margin={{ left: -10, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="ai_cost_usd" fill="var(--color-ai_cost_usd)" radius={2} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          ) : (
            <div className="mb-6"><Vacio titulo="Sin actividad en este periodo" texto="Las ejecuciones, aprobaciones y consultas al AI CMO aparecerán aquí en cuanto ocurran." /></div>
          )}
          <div className="mb-8 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Departamento</th>
                  <th className="px-3 py-2 text-right font-medium">Ejecuciones</th>
                  <th className="px-3 py-2 text-right font-medium">Completadas</th>
                  <th className="px-3 py-2 text-right font-medium">Con error</th>
                  <th className="px-3 py-2 text-right font-medium">Duración media</th>
                  <th className="px-3 py-2 text-right font-medium">Aprob. pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {act.datos.by_department.map((d) => (
                  <tr key={d.key}>
                    <td className="px-3 py-2">{d.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.runs}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.completed}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.failed}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.avg_seconds ? `${Math.round(d.avg_seconds)} s` : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.pending_approvals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Métricas de los departamentos</h2>
        {deptos.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {[["", "Todos"], ...deptos].map(([k, n]) => (
              <button key={k || "todos"} type="button" aria-pressed={depto === k} onClick={() => setDepto(k)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", depto === k ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
      {met.error && <ErrorCaja mensaje={met.error} />}
      {met.cargando && !met.datos ? (
        <CargandoFilas n={2} />
      ) : !met.datos || met.datos.metrics.length === 0 ? (
        <Vacio titulo="Sin métricas todavía" texto="Cada departamento registrará aquí las suyas (tráfico, alcance, conversiones, resultados de anuncios…) cuando se implemente. La estructura ya está lista." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {met.datos.metrics.map((m) => (
            <div key={`${m.department_key}:${m.metric}`} className="flex flex-col gap-1.5 rounded-lg border p-3">
              <p className="truncate text-xs text-muted-foreground">{m.department_name ?? "General"} · {m.metric.replace(/_/g, " ")}</p>
              <div className="flex items-end justify-between gap-2">
                <p className="text-2xl leading-none font-semibold tabular-nums">{m.value.toLocaleString("es-ES")}<span className="ml-1 text-xs font-normal text-muted-foreground">{m.unit}</span></p>
                <Sparkline puntos={m.series} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {m.change_pct === null ? "Sin dato previo con el que comparar" : <span className={m.change_pct >= 0 ? "text-green-700" : "text-red-700"}>{m.change_pct > 0 ? "+" : ""}{m.change_pct.toLocaleString("es-ES")} % vs. hace {dias} días</span>}
                {" · "}{fechaHora(m.recorded_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
