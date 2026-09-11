"use client";

import { Pie, PieChart, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { formatDuracion, type RemoteWorkerAppUsage } from "@/lib/remote-workers";

const COLORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const MAX_SEGMENTOS = 5;

/** Distribución de aplicaciones del día — PieChart de recharts dentro del
    wrapper shadcn (mismo wiring que ganancia-chart.tsx en Reportes, con
    Pie en vez de Bar). Las apps fuera del top 5 se agrupan en "Otras". */
export function AppDistributionChart({ apps }: { apps: RemoteWorkerAppUsage[] }) {
  if (apps.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de aplicaciones hoy</p>;
  }

  const top = apps.slice(0, MAX_SEGMENTOS);
  const resto = apps.slice(MAX_SEGMENTOS);
  const otras = resto.reduce((n, a) => n + a.seconds, 0);
  const datos = otras > 0
    ? [...top, { applicationName: "Otras", seconds: otras, percentage: resto.reduce((n, a) => n + a.percentage, 0) }]
    : top;

  const chartConfig: ChartConfig = Object.fromEntries(
    datos.map((d, i) => [d.applicationName, { label: d.applicationName, color: COLORES[i % COLORES.length] }]),
  );

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-56">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent hideLabel formatter={(_v, _n, item) => `${(item.payload as RemoteWorkerAppUsage).applicationName}: ${formatDuracion((item.payload as RemoteWorkerAppUsage).seconds)} (${(item.payload as RemoteWorkerAppUsage).percentage}%)`} />}
        />
        <Pie data={datos} dataKey="seconds" nameKey="applicationName" innerRadius={40} outerRadius={80} strokeWidth={2}>
          {datos.map((d, i) => <Cell key={d.applicationName} fill={COLORES[i % COLORES.length]} />)}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="applicationName" />} className="flex-wrap gap-2 text-xs" />
      </PieChart>
    </ChartContainer>
  );
}
