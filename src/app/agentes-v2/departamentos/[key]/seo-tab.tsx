"use client";

import { useState } from "react";
import Link from "next/link";
import { CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { fechaHoraLarga } from "@/lib/agentes-v2";
import { cn } from "@/lib/utils";
import type { EstadoTema, Tema } from "./use-seo";

export const ETIQUETA_TEMA: Record<EstadoTema, string> = { propuesto: "En cola", aprobado: "Priorizado", en_curso: "Escribiéndose", escrito: "Publicado", descartado: "Descartado" };
const COLOR: Record<EstadoTema, string> = {
  propuesto: "bg-slate-500/10 text-slate-600",
  aprobado: "bg-blue-500/10 text-blue-700",
  en_curso: "bg-amber-500/10 text-amber-700",
  escrito: "bg-green-500/10 text-green-700",
  descartado: "bg-slate-500/10 text-slate-400",
};
const FILTROS: ("" | EstadoTema)[] = ["", "propuesto", "aprobado", "en_curso", "escrito", "descartado"];

/** Fecha que acompaña al estado del tema: cuándo se publicó, se descartó o se movió por última vez. */
function fechaEstado(t: Tema): string | null {
  if (t.status === "escrito") return `Publicado ${fechaHoraLarga(t.updated_at)}`;
  if (t.status === "descartado") return `Descartado ${fechaHoraLarga(t.updated_at)}`;
  if (t.status === "en_curso") return `Desde ${fechaHoraLarga(t.updated_at)}`;
  if (t.status === "aprobado") return `Priorizado ${fechaHoraLarga(t.updated_at)}`;
  return null;
}

/** Lista de temas: cada tema es un artículo posible. Se filtra por estado y se puede priorizar o descartar. */
export function ListaTemas({ temas, counts, cargando, error, onCambiar }: {
  temas: Tema[];
  counts: Record<string, number>;
  cargando: boolean;
  error: string | null;
  onCambiar: (id: string, estado: EstadoTema) => void;
}) {
  const [filtro, setFiltro] = useState<"" | EstadoTema>("");
  const visibles = filtro ? temas.filter((t) => t.status === filtro) : temas;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button key={f || "todos"} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", filtro === f ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
            {f ? `${ETIQUETA_TEMA[f]} (${counts[f] ?? 0})` : `Todos (${temas.length})`}
          </button>
        ))}
      </div>
      {error && <ErrorCaja mensaje={error} />}
      {cargando ? (
        <CargandoFilas />
      ) : visibles.length === 0 ? (
        <Vacio titulo={filtro ? "No hay temas en este estado" : "Todavía no hay temas"} texto={filtro ? undefined : "Pulsa «Buscar temas ahora» en la primera etapa: el departamento lee sus fuentes y propone temas nuevos del nicho, sin repetir lo ya publicado."} />
      ) : (
        <ul className="divide-y rounded-lg border">
          {visibles.map((t) => {
            const f = fechaEstado(t);
            return (
              <li key={t.id} className="px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium" title={t.angle ?? undefined}>{t.title}</p>
                  <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium", COLOR[t.status])}>{ETIQUETA_TEMA[t.status]}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.kind === "noticia" ? "Noticia" : "Guía"} · {t.score} pts
                  {t.source_url ? <> · <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t.source_name || "fuente"}</a></> : null}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  <span className="tabular-nums text-muted-foreground">Creado {fechaHoraLarga(t.created_at)}</span>
                  {f && <span className="tabular-nums text-muted-foreground">{f}</span>}
                  <span className="ml-auto flex items-center gap-3">
                    {t.article_slug && <a href={`https://automatizacionesn8n.com/blog/${t.article_slug}`} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Ver artículo</a>}
                    {t.status === "en_curso" && t.approval_id && <Link href="/agentes-v2/aprobaciones" className="text-primary underline underline-offset-2">Ver el artículo pendiente</Link>}
                    {t.status === "propuesto" && <button type="button" className="text-primary hover:underline" onClick={() => onCambiar(t.id, "aprobado")} title="Se escribirá antes que el resto">Priorizar</button>}
                    {(t.status === "propuesto" || t.status === "aprobado") && <button type="button" className="text-muted-foreground hover:underline" onClick={() => onCambiar(t.id, "descartado")} title="Lo saca de la cola">Descartar</button>}
                    {t.status === "aprobado" && <button type="button" className="text-muted-foreground hover:underline" onClick={() => onCambiar(t.id, "propuesto")}>Quitar prioridad</button>}
                    {t.status === "descartado" && <button type="button" className="text-primary hover:underline" onClick={() => onCambiar(t.id, "propuesto")}>Recuperar</button>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
