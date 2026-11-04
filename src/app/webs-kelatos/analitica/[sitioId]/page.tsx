"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { GLOSARIO, lugarEnGoogle, n, variacion, type ConsultaGsc, type DetalleWeb } from "@/lib/webs-analitica";
import { GoogleAnalyticsWeb } from "./ga-analitica";
import { Termino } from "../termino";

const PERIODOS = [28, 90] as const;
const CONFIG = { clics: { label: "Visitas", color: "#2a6df4" }, impresiones: { label: "Apariciones", color: "#9aa5b8" } } satisfies ChartConfig;

function Tarjeta({ titulo, ayuda, pie, valor, actual, anterior, invertir }: { titulo: string; ayuda: string; pie: string; valor: string; actual?: number | null; anterior?: number | null; invertir?: boolean }) {
  const v = variacion(actual, anterior);
  const bueno = v === null ? true : invertir ? v <= 0 : v >= 0;
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground"><Termino etiqueta={titulo} ayuda={ayuda} /></p>
      <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">{valor}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{pie}</p>
      {v !== null && <p className={cn("mt-1 text-[11px] font-medium", bueno ? "text-emerald-600" : "text-red-600")}>{v >= 0 ? "▲" : "▼"} {Math.abs(Math.round(v))}% frente al periodo anterior</p>}
    </div>
  );
}

function TablaConsultas({ titulo, explicacion, ayuda, filas, vacio }: { titulo: string; explicacion: string; ayuda?: string; filas: ConsultaGsc[]; vacio: string }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <p className="text-sm font-semibold"><Termino etiqueta={titulo} ayuda={explicacion} /></p>
        {ayuda && <p className="text-[11px] text-muted-foreground">{ayuda}</p>}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Termino etiqueta="Búsqueda" ayuda={GLOSARIO.consultas} /></TableHead>
            <TableHead className="text-right"><Termino etiqueta="Visitas" ayuda={GLOSARIO.clics} /></TableHead>
            <TableHead className="text-right"><Termino etiqueta="Apariciones" ayuda={GLOSARIO.impresiones} /></TableHead>
            <TableHead className="text-right"><Termino etiqueta="Posición" ayuda={GLOSARIO.posicion} /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 && (
            <TableRow><TableCell colSpan={4} className="py-5 text-center text-sm text-muted-foreground">{vacio}</TableCell></TableRow>
          )}
          {filas.slice(0, 15).map((c) => (
            <TableRow key={c.consulta}>
              <TableCell className="max-w-xs whitespace-normal text-sm">{c.consulta}</TableCell>
              <TableCell className="text-right tabular-nums">{n(c.clics)}</TableCell>
              <TableCell className="text-right tabular-nums">{n(c.impresiones)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {n(c.posicion, 1)}
                {lugarEnGoogle(c.posicion) && <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium", lugarEnGoogle(c.posicion)!.clase)}>{lugarEnGoogle(c.posicion)!.texto}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Analítica de una web: Search Console (clics, impresiones, consultas, oportunidades, páginas). Google Analytics y la ficha local, pendientes de conectar. */
export default function AnaliticaWebPage() {
  const { sitioId } = useParams<{ sitioId: string }>();
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(28);
  const [datos, setDatos] = useState<DetalleWeb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dominio, setDominio] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    setError(null);
    fetch(`/api/webs-kelatos/analitica/sitio/${sitioId}?dias=${dias}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Error desconocido");
        setDatos(d as DetalleWeb);
        setDominio((d as DetalleWeb).web.dominio ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [sitioId, dias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardarDominio() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/webs-kelatos/analitica/sitio/${sitioId}/dominio`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dominio }) });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      toast.success(d.dominio ? (d.sincronizando ? "Dominio asignado: se están descargando sus datos de Search Console" : "Dominio asignado") : "Dominio quitado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!datos) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  const t = datos.totales;
  const a = datos.anterior;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground"><Link href="/webs-kelatos/analitica" className="hover:underline">Analítica web</Link> › {datos.web.nombre}</p>
          <h1 className="text-lg font-semibold">{datos.web.nombre}</h1>
          <p className="text-sm text-muted-foreground">{datos.web.dominio ?? "Sin dominio asignado"}{datos.web.tipo ? ` · ${datos.web.tipo}` : ""}</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODOS.map((p) => (
            <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", dias === p ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
              {p} días
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <div className="min-w-60 flex-1">
          <p className="mb-1 text-xs font-medium text-muted-foreground"><Termino etiqueta="Dirección de la web (dominio)" ayuda={GLOSARIO.dominio} /></p>
          <Input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="ejemplo.es" />
        </div>
        <Button size="sm" disabled={guardando || dominio.trim() === (datos.web.dominio ?? "")} onClick={guardarDominio}>{guardando ? "Guardando…" : "Guardar dominio"}</Button>
        {!datos.web.dominio && datos.gsc.cuentaServicio && (
          <p className="basis-full text-[11px] text-muted-foreground">Para que aparezcan datos, la cuenta de lectura ({datos.gsc.cuentaServicio}) debe estar como usuario «Restringido» en la propiedad de Search Console de ese dominio.</p>
        )}
      </div>

      {!datos.conectado || !t || !a ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm">
          <p className="font-medium">{datos.web.dominio ? "Todavía no hay datos de Search Console para este dominio" : "Asigna el dominio para ver su analítica"}</p>
          <p className="mt-1 text-muted-foreground">
            {datos.web.dominio
              ? "Puede que la cuenta de lectura aún no tenga acceso a la propiedad, o que la primera descarga esté en curso."
              : "Escribe el dominio de esta web (por ejemplo ejemplo.es) y guárdalo."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Tarjeta titulo="Visitas desde Google" ayuda={GLOSARIO.clics} pie="personas que han entrado en la web" valor={n(t.clics)} actual={t.clics} anterior={a.clics} />
            <Tarjeta titulo="Apariciones en Google" ayuda={GLOSARIO.impresiones} pie="veces que la web ha salido en una búsqueda" valor={n(t.impresiones)} actual={t.impresiones} anterior={a.impresiones} />
            <Tarjeta titulo="CTR" ayuda={GLOSARIO.ctr} pie="de cada 100 apariciones, cuántas acaban en visita" valor={t.ctr === null ? "—" : `${n(t.ctr, 1)} %`} actual={t.ctr} anterior={a.ctr} />
            <Tarjeta titulo="Posición media" ayuda={GLOSARIO.posicion} pie={lugarEnGoogle(t.posicion) ? `de media sale en la ${lugarEnGoogle(t.posicion)!.texto === "Más atrás" ? "parte baja de Google" : lugarEnGoogle(t.posicion)!.texto}` : "lugar en que sale en Google"} valor={n(t.posicion, 1)} actual={t.posicion} anterior={a.posicion} invertir />
          </div>
          {datos.ultimaSync && <p className="text-[11px] text-muted-foreground">Última descarga: {new Date(datos.ultimaSync).toLocaleString("es-ES")}{datos.ultimoError ? ` · último error: ${datos.ultimoError}` : ""}</p>}

          <div className="rounded-lg border bg-card p-3">
            <p className="mb-2 text-sm font-semibold">Visitas y apariciones por día <span className="font-normal text-muted-foreground">(línea azul: visitas · línea gris: apariciones)</span></p>
            <ChartContainer config={CONFIG} className="h-56 w-full">
              <LineChart data={datos.tendencia ?? []} margin={{ left: -8, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(f: string) => f.slice(5)} minTickGap={24} />
                <YAxis yAxisId="c" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <YAxis yAxisId="i" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line yAxisId="c" type="monotone" dataKey="clics" stroke="var(--color-clics)" strokeWidth={2} dot={false} />
                <Line yAxisId="i" type="monotone" dataKey="impresiones" stroke="var(--color-impresiones)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <TablaConsultas titulo="Oportunidades" explicacion={GLOSARIO.oportunidades} ayuda="Búsquedas en las que ya sales en la segunda página: con un empujón pueden subir a la primera." filas={datos.oportunidades ?? []} vacio="No hay oportunidades en este periodo." />
            <TablaConsultas titulo="Búsquedas nuevas" explicacion={GLOSARIO.nuevas} ayuda="Con estas búsquedas has aparecido por primera vez esta última semana." filas={datos.nuevas ?? []} vacio="Ninguna búsqueda nueva esta semana." />
            <TablaConsultas titulo="Búsquedas principales" explicacion={GLOSARIO.consultas} ayuda="Lo que más escribe la gente en Google para llegar a la web." filas={datos.principales ?? []} vacio="Sin búsquedas en este periodo." />
            <div className="rounded-lg border bg-card">
              <div className="border-b px-3 py-2"><p className="text-sm font-semibold"><Termino etiqueta="Páginas que más visitas reciben" ayuda={GLOSARIO.paginas} /></p></div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead className="text-right"><Termino etiqueta="Visitas" ayuda={GLOSARIO.clics} /></TableHead>
                    <TableHead className="text-right"><Termino etiqueta="Apariciones" ayuda={GLOSARIO.impresiones} /></TableHead>
                    <TableHead className="text-right"><Termino etiqueta="Posición" ayuda={GLOSARIO.posicion} /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(datos.paginas ?? []).slice(0, 15).map((p) => (
                    <TableRow key={p.pagina}>
                      <TableCell className="max-w-xs truncate text-sm" title={p.pagina}>{p.pagina.replace(/^https?:\/\/[^/]+/, "") || "/"}</TableCell>
                      <TableCell className="text-right tabular-nums">{n(p.clics)}</TableCell>
                      <TableCell className="text-right tabular-nums">{n(p.impresiones)}</TableCell>
                      <TableCell className="text-right tabular-nums">{n(p.posicion, 1)}</TableCell>
                    </TableRow>
                  ))}
                  {(datos.paginas ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-5 text-center text-sm text-muted-foreground">Sin páginas en este periodo.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      <GoogleAnalyticsWeb sitioId={String(sitioId)} dias={dias} dominio={datos.web.dominio} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
          <p className="font-medium">Ficha de Google (local business) <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">sin conectar</span></p>
          <p className="mt-1 text-xs text-muted-foreground">Falta solicitar a Google el acceso a la API de Business Profile para ver búsquedas, llamadas y rutas de la ficha.</p>
        </div>
      </div>
    </div>
  );
}
