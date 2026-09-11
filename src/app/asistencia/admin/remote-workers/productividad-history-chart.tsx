"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { RemoteWorkerHistoryRow } from "@/lib/remote-workers";

const chartConfig: ChartConfig = {
  productividad: { label: "Productividad", color: "var(--chart-1)" },
};

/** Histórico de productividad por día — mismo wiring que
    GananciaMensualChart (Reportes), con un eje Y en % en vez de €. */
export function ProductividadHistoryChart({ filas }: { filas: RemoteWorkerHistoryRow[] }) {
  if (filas.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin histórico todavía</p>;
  }

  const datos = [...filas].reverse().map((f) => ({
    etiqueta: new Date(f.dia).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
    productividad: f.productividad ?? 0,
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart data={datos} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} domain={[0, 100]} unit="%" />
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
        <Bar dataKey="productividad" fill="var(--color-productividad)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
