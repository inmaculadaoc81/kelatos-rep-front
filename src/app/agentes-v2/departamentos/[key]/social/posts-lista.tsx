"use client";

import { useState } from "react";
import { Add } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import type { EstadoCarrusel } from "./use-social";
import { cn } from "@/lib/utils";
import { EstadoBadge, Progreso, fechaCorta } from "./campos";
import { NuevoPost } from "./nuevo-post";
import { LAYOUTS, urlImagenPost, usePosts } from "./use-posts";

// "Publicados" por defecto (lo que de verdad importa a diario) y
// "Sin publicar" agrupa todo lo demás en un solo filtro — petición del
// usuario, 2026-10-01: antes "Todos" mezclaba publicado y sin publicar
// en la misma vista, sin forma rápida de separarlos. Mismo criterio que
// carruseles-lista.tsx.
const FILTROS: { valor: EstadoCarrusel | "todos" | "sin_publicar"; texto: string }[] = [
  { valor: "published", texto: "Publicados" },
  { valor: "sin_publicar", texto: "Sin publicar" },
  { valor: "todos", texto: "Todos" },
  { valor: "draft", texto: "Borradores" },
  { valor: "generated", texto: "Generados" },
  { valor: "review", texto: "En revisión" },
  { valor: "approved", texto: "Aprobados" },
];

export function PostsLista({ onAbrir }: { onAbrir: (id: number) => void }) {
  const { datos, error, cargando } = usePosts();
  const [filtro, setFiltro] = useState<EstadoCarrusel | "todos" | "sin_publicar">("published");
  const [nuevo, setNuevo] = useState(false);

  const lista = (datos?.posts ?? []).filter(
    (p) => filtro === "todos" || (filtro === "sin_publicar" ? p.status !== "published" : p.status === filtro)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={cn("h-7 rounded-full border px-3 text-xs transition-colors", filtro === f.valor ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {f.texto}
            </button>
          ))}
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setNuevo(true)}><Add className="size-4" />Nuevo post</Button>
      </div>

      {error && <ErrorCaja mensaje={error} />}
      {!datos && cargando && <CargandoFilas />}
      {datos && lista.length === 0 && (
        <Vacio
          titulo={
            filtro === "todos"
              ? "Todavía no hay posts"
              : filtro === "published"
                ? "Todavía no hay posts publicados"
                : filtro === "sin_publicar"
                  ? "No hay posts sin publicar"
                  : "No hay posts en ese estado"
          }
          texto={
            filtro === "todos"
              ? "Pulsa «Nuevo post», escribe el tema y la IA prepara la imagen y su copy para cada red."
              : filtro === "published"
                ? "Mira en «Sin publicar» para ver los que están en camino."
                : undefined
          }
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {lista.map((p) => {
          const trabajando = p.job?.state === "running";
          return (
            <button key={p.id} onClick={() => onAbrir(p.id)} className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md">
              <div className="relative aspect-[4/5] w-full bg-muted">
                {p.rendered && !trabajando ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagenPost(p.id, p.version, p.updated_at)} alt={`Imagen de ${p.title}`} loading="lazy" className="size-full object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
                    {trabajando ? (
                      <>
                        <p className="font-medium text-foreground">{p.job?.etapa}</p>
                        <div className="w-full"><Progreso valor={p.job?.progreso ?? 0} /></div>
                      </>
                    ) : (
                      <p>Sin imagen todavía</p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 p-3">
                <p className="line-clamp-2 text-sm leading-snug font-medium">{p.title}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <EstadoBadge estado={p.status} />
                  <span className="inline-flex h-5 items-center rounded-full border px-2 text-[11px] text-muted-foreground">{LAYOUTS.find((l) => l.valor === p.layout_type)?.texto ?? p.layout_type}</span>
                  {p.origen === "auto" && <span className="inline-flex h-5 items-center rounded-full border px-2 text-[11px] text-muted-foreground" title="Lo generó el sistema automático">Auto</span>}
                  <span className="text-[11px] text-muted-foreground">{fechaCorta(p.updated_at)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <NuevoPost abierto={nuevo} onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); onAbrir(id); }} />
    </div>
  );
}
