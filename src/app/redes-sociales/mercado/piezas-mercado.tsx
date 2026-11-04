"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { n } from "@/lib/webs-analitica";
import { nombreMes, type ConsultaMercado, type MesMercado } from "@/lib/mercado";
import { Termino } from "@/app/webs-kelatos/analitica/termino";

const CONFIG = { impresiones: { label: "Búsquedas donde aparece", color: "#2a9d6f" }, clics: { label: "Clics", color: "#9aa5b8" } } satisfies ChartConfig;

export function Tarjeta({ titulo, ayuda, valor, pie }: { titulo: string; ayuda?: string; valor: string; pie?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{ayuda ? <Termino etiqueta={titulo} ayuda={ayuda} /> : titulo}</p>
      <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">{valor}</p>
      {pie && <p className="mt-1.5 text-[11px] text-muted-foreground">{pie}</p>}
    </div>
  );
}

export function GraficoMensual({ datos, titulo }: { datos: MesMercado[]; titulo: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="mb-2 text-sm font-semibold">{titulo}</p>
      <ChartContainer config={CONFIG} className="h-48 w-full">
        <LineChart data={datos.map((d) => ({ ...d, etiqueta: nombreMes(d.mes) }))} margin={{ left: -8, right: 8, top: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="impresiones" stroke="var(--color-impresiones)" strokeWidth={2} dot />
          <Line type="monotone" dataKey="clics" stroke="var(--color-clics)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ChartContainer>
      <p className="mt-1 text-[11px] text-muted-foreground">El último mes puede estar incompleto.</p>
    </div>
  );
}

export function ListaConsultas({ titulo, ayuda, filas, vacio, conSitio }: { titulo: string; ayuda?: string; filas: ConsultaMercado[]; vacio: string; conSitio?: boolean }) {
  return (
    <div className="rounded-lg border bg-card">
      <p className="border-b px-3 py-2 text-sm font-semibold">{ayuda ? <Termino etiqueta={titulo} ayuda={ayuda} /> : titulo}</p>
      <ul className="divide-y text-sm">
        {filas.map((c) => (
          <li key={`${c.consulta}-${c.sitio ?? ""}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
            <span className="min-w-0 flex-1 truncate" title={c.consulta}>
              {c.consulta}
              {conSitio && c.sitio && <span className="ml-1.5 text-[11px] text-muted-foreground">{c.sitio}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">{n(c.impresiones)}</span> búsquedas
              {c.posicion !== null && <> · puesto {n(c.posicion, 1)}</>}
            </span>
          </li>
        ))}
        {filas.length === 0 && <li className="px-3 py-5 text-center text-muted-foreground">{vacio}</li>}
      </ul>
    </div>
  );
}
