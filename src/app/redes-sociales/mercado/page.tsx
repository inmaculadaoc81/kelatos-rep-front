"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { n } from "@/lib/webs-analitica";
import { AYUDA_MERCADO, type CompetenciaLocal, type GeneralMercado } from "@/lib/mercado";
import { Termino } from "@/app/webs-kelatos/analitica/termino";
import { GraficoMensual, ListaConsultas, Tarjeta } from "./piezas-mercado";
import { RecomendacionesIAPanel } from "./recomendaciones-ia";

const PERIODOS = [28, 90, 180] as const;

/** Estudio de mercado general: cómo se reparte la demanda entre todas las marcas de Kelatos y cómo es el mercado local. */
export default function MercadoGeneralPage() {
  const [dias, setDias] = useState<number>(90);
  const [res, setRes] = useState<{ dias: number; d: GeneralMercado } | null>(null);
  const d = res && res.dias === dias ? res.d : null;
  const [comp, setComp] = useState<CompetenciaLocal | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  useEffect(() => {
    fetch(`/api/mercado/general?dias=${dias}`).then((r) => r.json()).then((x) => setRes({ dias, d: x as GeneralMercado })).catch(() => setRes({ dias, d: { ok: false, error: "No se pudo cargar" } as GeneralMercado }));
  }, [dias]);
  useEffect(() => {
    fetch("/api/mercado/competencia").then((r) => r.json()).then((x) => setComp(x as CompetenciaLocal)).catch(() => setComp({ ok: false, error: "No se pudo consultar" } as CompetenciaLocal));
  }, []);

  const orgs = d?.organizaciones.filter((o) => o.impresiones > 0) ?? [];
  const maximo = Math.max(1, ...orgs.map((o) => o.impresiones));
  const visibles = verTodos ? orgs : orgs.slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Estudio de mercado · general</h1>
          <p className="text-sm text-muted-foreground">Cuánta gente busca lo que ofrece cada marca de Kelatos y dónde hay más demanda. Datos reales de Google Search Console.</p>
        </div>
        <div className="flex gap-1 rounded-lg border p-0.5 text-sm">
          {PERIODOS.map((p) => (
            <button key={p} onClick={() => setDias(p)} className={cn("rounded-md px-2.5 py-1", dias === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{p} días</button>
          ))}
        </div>
      </div>

      {!d && <Skeleton className="h-64 w-full" />}
      {d && !d.ok && <p className="text-sm text-red-600">{d.error ?? "Error"}</p>}
      {d?.ok && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Tarjeta titulo="Búsquedas donde aparecemos" ayuda={AYUDA_MERCADO.impresiones} valor={n(d.totalImpresiones)} pie={`En los últimos ${d.dias} días, todas las marcas`} />
            <Tarjeta titulo="Marcas con demanda" valor={String(orgs.length)} pie={`de ${d.organizaciones.length} organizaciones`} />
            <Tarjeta titulo="Marca líder" valor={orgs[0]?.nombre ?? "—"} pie={orgs[0] ? `${n(orgs[0].cuota, 1)} % de la demanda` : undefined} />
            <Tarjeta titulo="Negocios del sector en Madrid" ayuda={AYUDA_MERCADO.competencia} valor={comp ? (comp.ok ? n(comp.total) : "—") : "…"} pie="Reparación de informática y electrónica" />
          </div>

          <RecomendacionesIAPanel key={dias} organizacionId={null} dias={dias} />

          <GraficoMensual datos={d.mensual} titulo="Demanda mes a mes (todas las marcas)" />

          <div className="rounded-lg border bg-card">
            <p className="border-b px-3 py-2 text-sm font-semibold"><Termino etiqueta="Dónde está la demanda por marca" ayuda={AYUDA_MERCADO.cuota} /></p>
            <ul className="divide-y text-sm">
              {visibles.map((o) => {
                const sube = o.impresionesAnterior > 0 ? Math.round(((o.impresiones - o.impresionesAnterior) / o.impresionesAnterior) * 100) : null;
                return (
                  <li key={o.id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{o.nombre} <span className="text-[11px] font-normal text-muted-foreground">{o.dominio}</span></span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {n(o.impresiones)} · <span className="font-medium text-foreground">{n(o.cuota, 1)} %</span>
                        {sube !== null && <span className={cn("ml-2 text-[11px]", sube >= 0 ? "text-emerald-600" : "text-red-600")}>{sube >= 0 ? "▲" : "▼"} {Math.abs(sube)} %</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(o.impresiones / maximo) * 100}%` }} /></div>
                  </li>
                );
              })}
              {orgs.length === 0 && <li className="px-3 py-5 text-center text-muted-foreground">Aún no hay datos de Search Console.</li>}
            </ul>
            {orgs.length > 12 && <button className="w-full border-t px-3 py-2 text-xs text-muted-foreground hover:bg-muted" onClick={() => setVerTodos(!verTodos)}>{verTodos ? "Ver menos" : `Ver las ${orgs.length} marcas`}</button>}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ListaConsultas titulo="Lo más buscado" filas={d.top.slice(0, 15)} vacio="Sin datos." conSitio />
            <div className="rounded-lg border bg-card">
              <p className="border-b px-3 py-2 text-sm font-semibold"><Termino etiqueta="Webs nuestras que se pisan" ayuda={AYUDA_MERCADO.solapes} /></p>
              <ul className="divide-y text-sm">
                {d.solapes.slice(0, 12).map((s) => (
                  <li key={s.consulta} className="px-3 py-1.5">
                    <div className="flex justify-between gap-2"><span className="truncate" title={s.consulta}>{s.consulta}</span><span className="shrink-0 tabular-nums text-muted-foreground">{n(s.impresiones)}</span></div>
                    <p className="truncate text-[11px] text-muted-foreground">{s.sitios.join(" · ")}</p>
                  </li>
                ))}
                {d.solapes.length === 0 && <li className="px-3 py-5 text-center text-muted-foreground">Ninguna búsqueda se repite entre webs.</li>}
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="rounded-lg border bg-card">
        <p className="border-b px-3 py-2 text-sm font-semibold">
          <Termino etiqueta="Competencia local" ayuda={AYUDA_MERCADO.competencia} />{" "}
          {comp?.ok && <span className="font-normal text-muted-foreground">· {comp.sector} en {comp.zona}: {comp.total} negocios, {comp.conWeb} con web</span>}
        </p>
        {!comp && <Skeleton className="m-3 h-20" />}
        {comp && !comp.ok && <p className="p-3 text-sm text-muted-foreground">No se pudo consultar el mapa ahora mismo ({comp.error}). Se reintenta al recargar.</p>}
        {comp?.ok && (
          <ul className="grid divide-y text-sm sm:grid-cols-2 sm:divide-y-0">
            {comp.negocios.filter((x) => x.web).slice(0, 24).map((x) => (
              <li key={x.nombre} className="flex items-baseline justify-between gap-2 px-3 py-1.5">
                <span className="truncate">{x.nombre}</span>
                <a className="shrink-0 truncate text-[11px] text-muted-foreground underline" href={x.web!.startsWith("http") ? x.web! : `https://${x.web}`} target="_blank" rel="noopener noreferrer">{x.web!.replace(/^https?:\/\/(www\.)?/, "").slice(0, 28)}</a>
              </li>
            ))}
          </ul>
        )}
        {comp?.ok && <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">Se muestran los que tienen web. Fuente: OpenStreetMap, puede estar incompleto.</p>}
      </div>
    </div>
  );
}
