"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { GLOSARIO, lugarEnGoogle, n, variacion, type OportunidadWeb, type WebAnalitica } from "@/lib/webs-analitica";
import { Termino } from "./termino";

const PERIODOS = [28, 90] as const;

function Delta({ actual, anterior, dias }: { actual: number | null | undefined; anterior: number | null | undefined; dias: number }) {
  const v = variacion(actual, anterior);
  if (v === null) return null;
  const sube = v >= 0;
  return (
    <span className={cn("ml-1.5 text-[11px] font-medium", sube ? "text-emerald-600" : "text-red-600")} title={`${sube ? "Ha subido" : "Ha bajado"} un ${Math.abs(Math.round(v))} % frente a los ${dias} días anteriores`}>
      {sube ? "▲" : "▼"} {Math.abs(Math.round(v))}%
    </span>
  );
}

function Tarjeta({ titulo, ayuda, valor, delta, pie }: { titulo: string; ayuda: string; valor: React.ReactNode; delta?: React.ReactNode; pie: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground"><Termino etiqueta={titulo} ayuda={ayuda} /></p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}{delta}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{pie}</p>
    </div>
  );
}

/** Guía corta para quien nunca ha visto estas cifras. */
function GuiaDeLectura({ dias }: { dias: number }) {
  return (
    <details className="rounded-lg border bg-muted/30 p-3 text-sm">
      <summary className="cursor-pointer font-medium">¿Cómo leer esta página? (explicado sin tecnicismos)</summary>
      <div className="mt-2 space-y-2 text-muted-foreground">
        <p>Estas cifras vienen de <strong className="text-foreground">Google</strong>: cuentan cómo encuentra la gente cada una de nuestras webs cuando busca algo en Google. Se muestran los últimos {dias} días y se comparan con los {dias} anteriores.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-foreground">Impresiones</strong>: las veces que la web ha salido en Google. Es como el número de personas que han pasado por delante del escaparate.</li>
          <li><strong className="text-foreground">Clics</strong>: las veces que alguien ha entrado. Son las personas que han abierto la puerta.</li>
          <li><strong className="text-foreground">CTR</strong>: de cada 100 veces que sale la web, cuántas personas entran. Si es bajo, las ven pero no entran.</li>
          <li><strong className="text-foreground">Posición</strong>: el lugar en que sale en Google (1 es el primero). Hasta el 10 está en la primera página, que es la que casi todo el mundo mira.</li>
          <li><strong className="text-foreground">Oportunidades</strong>: búsquedas en las que ya sale en la segunda página; con un pequeño empujón pueden pasar a la primera.</li>
        </ul>
        <p>Pasa el cursor por cualquier palabra con el subrayado punteado para ver su explicación.</p>
      </div>
    </details>
  );
}

/** Qué falta para ver Google Analytics y la ficha local: no depende de ninguna web en concreto. */
function ConexionesPendientes() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
        <p className="font-medium">Google Analytics <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">se ve en la ficha de cada web</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Añade las visitas totales, de dónde llegan y qué páginas ven. Aparece en cada web que tenga su propiedad de Analytics con acceso para la cuenta de lectura.</p>
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
          <p className="text-sm text-muted-foreground">Cómo encuentra la gente cada una de nuestras webs en Google, y qué búsquedas están a punto de traer más visitas. Los datos llevan 2-3 días de retraso.</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODOS.map((p) => (
            <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", dias === p ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
              Últimos {p} días
            </button>
          ))}
        </div>
      </div>

      <GuiaDeLectura dias={dias} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!webs && !error ? (
        <Skeleton className="h-96 w-full" />
      ) : webs ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Tarjeta titulo="Visitas desde Google" ayuda={GLOSARIO.clics} valor={n(totales.clics)} delta={<Delta actual={totales.clics} anterior={totales.clicsAnt} dias={dias} />} pie="personas que han entrado en alguna de nuestras webs" />
            <Tarjeta titulo="Apariciones en Google" ayuda={GLOSARIO.impresiones} valor={n(totales.impresiones)} delta={<Delta actual={totales.impresiones} anterior={totales.impresionesAnt} dias={dias} />} pie="veces que alguna web ha salido en una búsqueda" />
            <Tarjeta titulo="Webs con datos" ayuda={GLOSARIO.websConDatos} valor={<>{totales.conectadas}<span className="text-sm font-normal text-muted-foreground"> / {webs.length}</span></>} pie="webs de las que Google ya nos da cifras" />
            <Tarjeta titulo="Webs sin dominio" ayuda={GLOSARIO.dominio} valor={totales.sinDominio} pie="hay que indicar su dirección para ver sus datos" />
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
              <p className="text-xs text-muted-foreground">Ordenadas por visitas. Pulsa el nombre de una web para ver el detalle: qué buscan, qué páginas funcionan y qué se puede mejorar.</p>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Web</TableHead>
                      <TableHead><Termino etiqueta="Dirección" ayuda={GLOSARIO.dominio} /></TableHead>
                      <TableHead className="text-right"><Termino etiqueta="Visitas" ayuda={GLOSARIO.clics} /></TableHead>
                      <TableHead className="text-right"><Termino etiqueta="Apariciones" ayuda={GLOSARIO.impresiones} /></TableHead>
                      <TableHead className="text-right"><Termino etiqueta="CTR" ayuda={GLOSARIO.ctr} /></TableHead>
                      <TableHead className="text-right"><Termino etiqueta="Posición en Google" ayuda={GLOSARIO.posicion} /></TableHead>
                      <TableHead><Termino etiqueta="Estado" ayuda={GLOSARIO.estado} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenadas.map((w) => {
                      const lugar = lugarEnGoogle(w.actual?.posicion);
                      return (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">
                            <Link href={`/webs-kelatos/analitica/${w.id}`} className="hover:underline">{w.nombre}</Link>
                            {w.tipo && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{w.tipo}</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{w.dominio ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{w.actual ? <>{n(w.actual.clics)}<Delta actual={w.actual.clics} anterior={w.anterior?.clics} dias={dias} /></> : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{w.actual ? <>{n(w.actual.impresiones)}<Delta actual={w.actual.impresiones} anterior={w.anterior?.impresiones} dias={dias} /></> : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{w.actual ? `${n(w.actual.ctr, 1)} %` : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {w.actual ? (
                              <>
                                {n(w.actual.posicion, 1)}
                                {lugar && <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium", lugar.clase)}>{lugar.texto}</span>}
                              </>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {!w.dominio ? (
                              <Link href={`/webs-kelatos/analitica/${w.id}`} className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 hover:underline">Indicar dirección</Link>
                            ) : w.error ? (
                              <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-700" title={w.error}>Error al actualizar</span>
                            ) : w.conectado ? (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700">Con datos</span>
                            ) : (
                              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground" title="Falta dar acceso a la cuenta de lectura en Search Console para esta web">Sin acceso a Google</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {sinWeb.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Direcciones con datos que aún no están asignadas a ninguna web: {sinWeb.join(", ")}. Asígnalas desde la ficha de la web correspondiente.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
                <p className="font-medium"><Termino etiqueta="¿Qué son las oportunidades?" ayuda={GLOSARIO.oportunidades} /></p>
                <p className="mt-1 text-xs text-muted-foreground">Búsquedas en las que una de nuestras webs ya sale en la segunda página de Google y que la gente hace de verdad. Con un pequeño empujón (mejorar el título o el texto de esa página) pueden pasar a la primera y traer visitas. Las de más apariciones son las que más compensan.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Web" className="h-9 rounded-md border bg-background px-2 text-sm" value={filtroWeb} onChange={(e) => setFiltroWeb(e.target.value)}>
                  <option value="">Todas las webs</option>
                  {[...new Map((oportunidades ?? []).map((o) => [o.sitio_id, o.nombre])).entries()].map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Termino etiqueta="Búsqueda" ayuda={GLOSARIO.consultas} /></TableHead>
                      <TableHead>Web</TableHead>
                      <TableHead className="text-right"><Termino etiqueta="Apariciones" ayuda={GLOSARIO.impresiones} /></TableHead>
                      <TableHead className="text-right"><Termino etiqueta="Visitas" ayuda={GLOSARIO.clics} /></TableHead>
                      <TableHead className="text-right"><Termino etiqueta="CTR" ayuda={GLOSARIO.ctr} /></TableHead>
                      <TableHead className="text-right"><Termino etiqueta="Posición" ayuda={GLOSARIO.posicion} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {oportunidades === null && (
                      <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Cargando…</TableCell></TableRow>
                    )}
                    {oportunidades !== null && oportunidadesFiltradas.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No hay oportunidades en este periodo.</TableCell></TableRow>
                    )}
                    {oportunidadesFiltradas.map((o, i) => {
                      const lugar = lugarEnGoogle(o.posicion);
                      return (
                        <TableRow key={`${o.sitio_id}-${o.consulta}-${i}`}>
                          <TableCell className="max-w-sm whitespace-normal font-medium">{o.consulta}</TableCell>
                          <TableCell><Link href={`/webs-kelatos/analitica/${o.sitio_id}`} className="text-sm hover:underline">{o.nombre}</Link></TableCell>
                          <TableCell className="text-right tabular-nums">{n(o.impresiones)}</TableCell>
                          <TableCell className="text-right tabular-nums">{n(o.clics)}</TableCell>
                          <TableCell className="text-right tabular-nums">{o.ctr === null || o.ctr === undefined ? "—" : `${n(o.ctr, 1)} %`}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {n(o.posicion, 1)}
                            {lugar && <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium", lugar.clase)}>{lugar.texto}</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
