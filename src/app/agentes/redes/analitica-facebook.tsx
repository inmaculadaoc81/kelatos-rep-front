"use client";

import { useV2 } from "@/components/agentes-v2/use-v2";
import { CargandoFilas, ErrorCaja, Kpi } from "@/components/agentes-v2/componentes";
import { fechaHora } from "@/lib/agentes-v2";

interface PublicacionFb {
  id: string;
  fecha: string;
  texto: string;
  enlace: string | null;
  reacciones: number;
  comentarios: number;
  compartidos: number;
  interacciones: number;
}

interface ResumenFb {
  ok: boolean;
  configurado: boolean;
  error?: string | null;
  aviso?: string | null;
  actualizado_en?: string;
  pagina?: { id: string; nombre: string; seguidores: number | null; fans: number | null; enlace: string | null } | null;
  periodo?: { dias: number; publicaciones: number; reacciones: number; comentarios: number; compartidos: number; interacciones: number; interacciones_por_publicacion: number | null };
  metricas?: { interacciones_pagina?: number; visualizaciones?: number; alcance?: number; visitas_pagina?: number; nuevos_seguidores?: number };
  publicaciones?: PublicacionFb[];
}

const n = (v: number | null | undefined, dec = 0) => (v === null || v === undefined ? "—" : v.toLocaleString("es-ES", { maximumFractionDigits: dec }));

/** Analítica de la página de Facebook enlazada a la cuenta de Instagram de la organización activa (solo lectura). */
export function AnaliticaFacebook({ dias }: { dias: number }) {
  const { datos, error, cargando } = useV2<ResumenFb>(`social/analytics/facebook?dias=${dias}`);
  const p = datos?.periodo;
  const m = datos?.metricas ?? {};

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {datos?.pagina ? (
          <span className="font-medium text-foreground">{datos.pagina.enlace ? <a href={datos.pagina.enlace} target="_blank" rel="noopener noreferrer" className="hover:underline">{datos.pagina.nombre}</a> : datos.pagina.nombre}</span>
        ) : "Facebook"}
        {datos?.actualizado_en ? ` · leído ${fechaHora(datos.actualizado_en)} (se refresca cada 10 min)` : ""}
      </p>

      {error && <ErrorCaja mensaje={error} />}
      {cargando && !datos ? (
        <CargandoFilas n={3} />
      ) : datos && !datos.configurado ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">Esta organización no tiene token de Meta configurado, así que no se puede leer su página de Facebook.</div>
      ) : datos && !datos.pagina ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">{datos.error || "No se encontró la página de Facebook."}</div>
      ) : datos && datos.pagina && p ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi titulo="Seguidores" valor={n(datos.pagina.seguidores)} sub={`${n(datos.pagina.fans)} Me gusta de la página`} />
            <Kpi titulo="Publicaciones" valor={n(p.publicaciones)} sub={`últimos ${p.dias} días`} />
            <Kpi titulo="Interacciones" valor={n(p.interacciones)} sub={`${n(p.reacciones)} reacciones · ${n(p.comentarios)} comentarios · ${n(p.compartidos)} compartidos`} />
            <Kpi titulo="Por publicación" valor={n(p.interacciones_por_publicacion, 1)} sub="interacciones de media" />
          </div>
          {(m.alcance !== undefined || m.visualizaciones !== undefined || m.visitas_pagina !== undefined || m.nuevos_seguidores !== undefined) && (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {m.alcance !== undefined && <Kpi titulo="Alcance" valor={n(m.alcance)} sub={`personas, ${p.dias} días`} />}
              {m.visualizaciones !== undefined && <Kpi titulo="Visualizaciones" valor={n(m.visualizaciones)} sub={`${p.dias} días`} />}
              {m.visitas_pagina !== undefined && <Kpi titulo="Visitas a la página" valor={n(m.visitas_pagina)} sub={`${p.dias} días`} />}
              {m.nuevos_seguidores !== undefined && <Kpi titulo="Nuevos seguidores" valor={n(m.nuevos_seguidores)} sub={`${p.dias} días`} />}
            </div>
          )}
          {datos.aviso && <ErrorCaja mensaje={datos.aviso} />}
          <div className="rounded-lg border bg-card">
            <p className="border-b px-3 py-2 text-sm font-semibold">Publicaciones con más interacción</p>
            {(datos.publicaciones ?? []).length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No hay publicaciones en los últimos {p.dias} días.</p>
            ) : (
              <ul className="divide-y text-sm">
                {(datos.publicaciones ?? []).map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <span className="min-w-0 flex-1 truncate">{x.texto || "(sin texto)"}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{x.fecha.slice(0, 10).split("-").reverse().join("/")}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground"><span className="font-medium text-foreground">{x.interacciones}</span> ({x.reacciones}·{x.comentarios}·{x.compartidos})</span>
                    {x.enlace && <a href={x.enlace} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary underline-offset-2 hover:underline">Abrir</a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
