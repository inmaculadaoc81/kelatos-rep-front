"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { FilaBarra } from "./barras";

const chartConfig: ChartConfig = {
  valor: { label: "Ganancia neta", color: "var(--chart-money)" },
};

/**
 * Reemplaza las barras horizontales de "Ganancia neta por mes" por un
 * gráfico shadcn/Recharts real — mismo dato (barrasMes), mismo color de
 * marca (--chart-money), pero con eje temporal y tooltip nativos en vez
 * de una lista de barras horizontales.
 */
export function GananciaMensualChart({ filas }: { filas: FilaBarra[] }) {
  if (!filas.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin datos históricos</p>;
  }

  // `filas` llega en orden "más reciente primero" (pensado para la lista de
  // barras horizontales); un eje de tiempo se lee de izquierda a derecha.
  const datos = [...filas].reverse();

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart data={datos} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_value, _name, item) => (item.payload as FilaBarra).valorTexto}
            />
          }
        />
        <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
