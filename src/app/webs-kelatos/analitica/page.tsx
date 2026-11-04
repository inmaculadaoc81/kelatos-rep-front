"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { n, variacion, type OportunidadWeb, type WebAnalitica } from "@/lib/webs-analitica";

const PERIODOS = [28, 90] as const;

function Delta({ actual, anterior }: { actual: number | null | undefined; anterior: number | null | undefined }) {
  const v = variacion(actual, anterior);
  if (v === null) return null;
  return <span className={cn("ml-1 text-[11px]", v >= 0 ? "text-emerald-600" : "text-red-600")}>{v >= 0 ? "▲" : "▼"} {Math.abs(Math.round(v))}%</span>;
}

/** Qué falta para ver Google Analytics y la ficha local: no depende de ninguna web en concreto. */
function ConexionesPendientes() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
        <p className="font-medium">Google Analytics <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">sin conectar</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Falta activar la API de Google Analytics en el proyecto de Google Cloud y añadir la cuenta de lectura como lector en cada propiedad de GA4. Después se verán visitas, usuarios y de dónde llegan.</p>
      </div>
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
        <p className="font-medium">Ficha de Google (local business) <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">sin conectar</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Google exige solicitar el acceso a la API de Business Profile. Cuando lo apruebe se verán búsquedas, llamadas, rutas y visitas a la web desde cada ficha.</p>
      </div>
    </div>
  );
}

/** Analítica de todas las webs de Webs Kelatos (Google Search Console) y sus oportunidades. */
export default function AnaliticaWebsPage() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(28);
  const [vista, setVista] = useState<"webs" | "oportunidades">("webs");
  const [webs, setWebs] = useState<WebAnalitica[] | null>(null);
  const [sinWeb, setSinWeb] = useState<string[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadWeb[] | null>(null);
  const [filtroWeb, setFiltroWeb] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWebs(null);
    setError(null);
    fetch(`/api/webs-kelatos/analitica/resumen?dias=${dias}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Error desconocido");
        setWebs(d.webs as WebAnalitica[]);
        setSinWeb(d.dominiosSinWeb as string[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
    fetch(`/api/webs-kelatos/analitica/oportunidades?dias=${dias}`)
      .then((r) => r.json())
      .then((d) => d.ok && setOportunidades(d.oportunidades as OportunidadWeb[]))
      .catch(() => {});
  }, [dias]);

  const ordenadas = useMemo(() => [...(webs ?? [])].sort((a, b) => (b.actual?.clics ?? -1) - (a.actual?.clics ?? -1) || a.nombre.localeCompare(b.nombre)), [webs]);
  const totales = useMemo(() => {
    const con = (webs ?? []).filter((w) => w.actual);
    return {
      clics: con.reduce((s, w) => s + (w.actual?.clics ?? 0), 0),
      clicsAnt: con.reduce((s, w) => s + (w.anterior?.clics ?? 0), 0),
      impresiones: con.reduce((s, w) => s + (w.actual?.impresiones ?? 0), 0),
      impresionesAnt: con.reduce((s, w) => s + (w.anterior?.impresiones ?? 0), 0),
      conectadas: con.length,
      sinDominio: (webs ?? []).filter((w) => !w.dominio).length,
    };
  }, [webs]);
  const oportunidadesFiltradas = (oportunidades ?? []).filter((o) => !filtroWeb || String(o.sitio_id) === filtroWeb);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Analítica web</h1>
          <p className="text-sm text-muted-foreground">Cómo llegan las personas a cada web desde Google (Search Console) y qué consultas están a punto de subir. Los datos llevan 2-3 días de retraso.</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODOS.map((p) => (
            <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", dias === p ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
              {p} días
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!webs && !error ? (
        <Skeleton className="h-96 w-full" />
      ) : webs ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Clics (todas las webs)</p><p className="mt-1 text-2xl font-semibold tabular-nums">{n(totales.clics)}<Delta actual={totales.clics} anterior={totales.clicsAnt} /></p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Impresiones</p><p className="mt-1 text-2xl font-semibold tabular-nums">{n(totales.impresiones)}<Delta actual={totales.impresiones} anterior={totales.impresionesAnt} /></p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Webs con datos</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totales.conectadas}<span className="text-sm font-normal text-muted-foreground"> / {webs.length}</span></p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Webs sin dominio asignado</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totales.sinDominio}</p></div>
          </div>

          <ConexionesPendientes />

          <div className="flex gap-1.5 border-b pb-2">
            {([["webs", "Webs"], ["oportunidades", `Oportunidades${oportunidades ? ` (${oportunidades.length})` : ""}`]] as const).map(([v, etiqueta]) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", vista === v ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>
                {etiqueta}
              </button>
            ))}
          </div>

          {vista === "webs" ? (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Web</TableHead>
                      <TableHead>Dominio</TableHead>
                      <TableHead className="text-right">Clics</TableHead>
                      <TableHead className="text-right">Impresiones</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Posición</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenadas.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">
                          <Link href={`/webs-kelatos/analitica/${w.id}`} className="hover:underline">{w.nombre}</Link>
                          {w.tipo && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{w.tipo}</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{w.dominio ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{w.actual ? <>{n(w.actual.clics)}<Delta actual={w.actual.clics} anterior={w.anterior?.clics} /></> : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{w.actual ? <>{n(w.actual.impresiones)}<Delta actual={w.actual.impresiones} anterior={w.anterior?.impresiones} /></> : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{w.actual ? `${n(w.actual.ctr, 1)} %` : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{w.actual ? n(w.actual.posicion, 1) : "—"}</TableCell>
                        <TableCell className="text-xs">
                          {!w.dominio ? (
                            <Link href={`/webs-kelatos/analitica/${w.id}`} className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 hover:underline">Asignar dominio</Link>
                          ) : w.error ? (
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-700" title={w.error}>Error al sincronizar</span>
                          ) : w.conectado ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700">Con datos</span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground" title="La cuenta de lectura aún no tiene esta propiedad en Search Console">Sin Search Console</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {sinWeb.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Dominios con datos que aún no están asignados a ninguna web: {sinWeb.join(", ")}. Asígnalos desde la ficha de la web correspondiente.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Web" className="h-9 rounded-md border bg-background px-2 text-sm" value={filtroWeb} onChange={(e) => setFiltroWeb(e.target.value)}>
                  <option value="">Todas las webs</option>
                  {[...new Map((oportunidades ?? []).map((o) => [o.sitio_id, o.nombre])).entries()].map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Consultas que ya salen entre las posiciones 8 y 20 de Google y tienen búsquedas: son las más fáciles de subir a la primera página.</p>
              </div>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consulta</TableHead>
                      <TableHead>Web</TableHead>
                      <TableHead className="text-right">Impresiones</TableHead>
                      <TableHead className="text-right">Clics</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Posición</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {oportunidades === null && (
                      <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Cargando…</TableCell></TableRow>
                    )}
                    {oportunidades !== null && oportunidadesFiltradas.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No hay oportunidades en este periodo.</TableCell></TableRow>
                    )}
                    {oportunidadesFiltradas.map((o, i) => (
                      <TableRow key={`${o.sitio_id}-${o.consulta}-${i}`}>
                        <TableCell className="max-w-sm whitespace-normal font-medium">{o.consulta}</TableCell>
                        <TableCell><Link href={`/webs-kelatos/analitica/${o.sitio_id}`} className="text-sm hover:underline">{o.nombre}</Link></TableCell>
                        <TableCell className="text-right tabular-nums">{n(o.impresiones)}</TableCell>
                        <TableCell className="text-right tabular-nums">{n(o.clics)}</TableCell>
                        <TableCell className="text-right tabular-nums">{o.ctr === null || o.ctr === undefined ? "—" : `${n(o.ctr, 1)} %`}</TableCell>
                        <TableCell className="text-right tabular-nums">{n(o.posicion, 1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
