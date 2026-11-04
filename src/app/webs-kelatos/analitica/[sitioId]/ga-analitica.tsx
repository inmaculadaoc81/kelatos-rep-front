"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GLOSARIO, n, variacion } from "@/lib/webs-analitica";
import { Termino } from "../termino";

interface TotalesGa {
  sesiones: number | null;
  usuarios: number | null;
  vistas: number | null;
  tasa_interaccion: number | null;
  duracion_media: number | null;
}

interface RespuestaGa {
  ok: boolean;
  estado: "ok" | "api_desactivada" | "sin_acceso" | "sin_propiedad" | "sin_dominio" | "no_configurado" | "error";
  detalle?: string;
  proyecto?: string | null;
  cuentaServicio?: string | null;
  propiedad?: { id: string; nombre: string; cuenta: string };
  totales?: TotalesGa;
  anterior?: TotalesGa;
  tendencia?: { fecha: string; sesiones: number | null; usuarios: number | null }[];
  canales?: { canal: string; sesiones: number | null; usuarios: number | null }[];
  paginas?: { pagina: string; vistas: number | null; usuarios: number | null }[];
}

const CONFIG = { sesiones: { label: "Visitas", color: "#2a9d6f" }, usuarios: { label: "Personas", color: "#9aa5b8" } } satisfies ChartConfig;
const duracion = (s: number | null) => (s === null ? "—" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

function Tarjeta({ titulo, ayuda, valor, actual, anterior }: { titulo: string; ayuda: string; valor: string; actual?: number | null; anterior?: number | null }) {
  const v = variacion(actual, anterior);
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground"><Termino etiqueta={titulo} ayuda={ayuda} /></p>
      <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">{valor}</p>
      {v !== null && <p className={cn("mt-1.5 text-[11px]", v >= 0 ? "text-emerald-600" : "text-red-600")}>{v >= 0 ? "▲" : "▼"} {Math.abs(Math.round(v))}% frente al periodo anterior</p>}
    </div>
  );
}

/** Google Analytics (GA4) de una web. Si falta algo en Google, explica exactamente qué. */
export function GoogleAnalyticsWeb({ sitioId, dias, dominio }: { sitioId: string; dias: number; dominio: string | null }) {
  const [d, setD] = useState<RespuestaGa | null>(null);

  useEffect(() => {
    setD(null);
    fetch(`/api/webs-kelatos/analitica/sitio/${sitioId}/ga?dias=${dias}`)
      .then((r) => r.json())
      .then((x) => setD(x as RespuestaGa))
      .catch(() => setD({ ok: false, estado: "error", detalle: "No se pudo consultar Google Analytics" }));
  }, [sitioId, dias, dominio]);

  if (!d) return <Skeleton className="h-24 w-full" />;

  if (d.estado !== "ok" || !d.totales || !d.anterior) {
    const pasos =
      d.estado === "api_desactivada" ? (
        <>
          Activa en Google Cloud (proyecto {d.proyecto ?? "de la cuenta de lectura"}) las APIs{" "}
          <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview${d.proyecto ? `?project=${d.proyecto}` : ""}`}>Google Analytics Data</a> y{" "}
          <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview${d.proyecto ? `?project=${d.proyecto}` : ""}`}>Google Analytics Admin</a>.
          Después, añade {d.cuentaServicio ?? "la cuenta de lectura"} como «Lector» en la propiedad de GA4 de esta web.
        </>
      ) : d.estado === "sin_propiedad" || d.estado === "sin_acceso" ? (
        <>Añade {d.cuentaServicio ?? "la cuenta de lectura"} como «Lector» en la propiedad de GA4 de esta web (Google Analytics → Administrar → Acceso a la propiedad).</>
      ) : null;
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
        <p className="font-medium">Google Analytics <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">{d.estado === "error" ? "error" : "sin conectar"}</span></p>
        {d.detalle && <p className="mt-1 text-xs text-muted-foreground">{d.detalle}</p>}
        {pasos && <p className="mt-1 text-xs text-muted-foreground">{pasos}</p>}
      </div>
    );
  }

  const t = d.totales;
  const a = d.anterior;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Google Analytics</p>
        {d.propiedad && <p className="text-[11px] text-muted-foreground">Propiedad: {d.propiedad.nombre} ({d.propiedad.cuenta})</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Tarjeta titulo="Visitas totales" ayuda={GLOSARIO.sesiones} valor={n(t.sesiones)} actual={t.sesiones} anterior={a.sesiones} />
        <Tarjeta titulo="Personas" ayuda={GLOSARIO.usuarios} valor={n(t.usuarios)} actual={t.usuarios} anterior={a.usuarios} />
        <Tarjeta titulo="Páginas vistas" ayuda={GLOSARIO.vistas} valor={n(t.vistas)} actual={t.vistas} anterior={a.vistas} />
        <Tarjeta titulo="Visitas con interés" ayuda={GLOSARIO.tasaInteraccion} valor={t.tasa_interaccion === null ? "—" : `${n(t.tasa_interaccion, 1)} %`} actual={t.tasa_interaccion} anterior={a.tasa_interaccion} />
        <Tarjeta titulo="Tiempo en la web" ayuda={GLOSARIO.duracionMedia} valor={duracion(t.duracion_media)} actual={t.duracion_media} anterior={a.duracion_media} />
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="mb-2 text-sm font-semibold">Visitas y personas por día</p>
        <ChartContainer config={CONFIG} className="h-48 w-full">
          <LineChart data={d.tendencia ?? []} margin={{ left: -8, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(f: string) => f.slice(5)} minTickGap={24} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="sesiones" stroke="var(--color-sesiones)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="usuarios" stroke="var(--color-usuarios)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <p className="border-b px-3 py-2 text-sm font-semibold">De dónde llegan</p>
          <ul className="divide-y text-sm">
            {(d.canales ?? []).map((c) => (
              <li key={c.canal} className="flex items-center justify-between px-3 py-1.5">
                <span>{c.canal}</span>
                <span className="tabular-nums text-muted-foreground"><span className="font-medium text-foreground">{n(c.sesiones)}</span> visitas</span>
              </li>
            ))}
            {(d.canales ?? []).length === 0 && <li className="px-3 py-5 text-center text-muted-foreground">Sin datos en este periodo.</li>}
          </ul>
        </div>
        <div className="rounded-lg border bg-card">
          <p className="border-b px-3 py-2 text-sm font-semibold">Páginas más vistas</p>
          <ul className="divide-y text-sm">
            {(d.paginas ?? []).map((p) => (
              <li key={p.pagina} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="min-w-0 flex-1 truncate" title={p.pagina}>{p.pagina}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground"><span className="font-medium text-foreground">{n(p.vistas)}</span> vistas</span>
              </li>
            ))}
            {(d.paginas ?? []).length === 0 && <li className="px-3 py-5 text-center text-muted-foreground">Sin datos en este periodo.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
