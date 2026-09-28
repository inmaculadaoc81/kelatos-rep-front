"use client";

import { useState } from "react";
import { Add } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { cn } from "@/lib/utils";
import { EstadoBadge, Progreso, TipoBadge, fechaCorta } from "./campos";
import { NuevoCarrusel } from "./nuevo-carrusel";
import { ESTADO_TEXTO, urlImagen, useCarruseles, type EstadoCarrusel } from "./use-social";

const FILTROS: { valor: EstadoCarrusel | "todos"; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "draft", texto: "Borradores" },
  { valor: "generated", texto: "Generados" },
  { valor: "review", texto: "En revisión" },
  { valor: "approved", texto: "Aprobados" },
];

export function CarruselesLista({ onAbrir }: { onAbrir: (id: number) => void }) {
  const { datos, error, cargando } = useCarruseles();
  const [filtro, setFiltro] = useState<EstadoCarrusel | "todos">("todos");
  const [nuevo, setNuevo] = useState(false);

  const lista = (datos?.carousels ?? []).filter((c) => filtro === "todos" || c.status === filtro);

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
        <Button size="sm" className="ml-auto" onClick={() => setNuevo(true)}><Add className="size-4" />Nuevo carrusel</Button>
      </div>

      {error && <ErrorCaja mensaje={error} />}
      {!datos && cargando && <CargandoFilas />}
      {datos && lista.length === 0 && (
        <Vacio
          titulo={filtro === "todos" ? "Todavía no hay carruseles" : `No hay carruseles ${ESTADO_TEXTO[filtro as EstadoCarrusel].texto.toLowerCase()}s`}
          texto={filtro === "todos" ? "Pulsa «Nuevo carrusel», escribe el tema y la IA prepara las slides listas para Instagram." : undefined}
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {lista.map((c) => {
          const trabajando = c.job?.state === "running";
          return (
            <button key={c.id} onClick={() => onAbrir(c.id)} className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md">
              <div className="relative aspect-[4/5] w-full bg-muted">
                {c.cover_slide_id && c.cover_version && !trabajando ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagen(c.id, c.cover_slide_id, c.cover_version, c.updated_at)} alt={`Portada de ${c.title}`} loading="lazy" className="size-full object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
                    {trabajando ? (
                      <>
                        <p className="font-medium text-foreground">{c.job?.etapa}</p>
                        <div className="w-full"><Progreso valor={c.job?.progreso ?? 0} /></div>
                      </>
                    ) : (
                      <p>Sin imagen todavía</p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 p-3">
                <p className="line-clamp-2 text-sm leading-snug font-medium">{c.title}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <EstadoBadge estado={c.status} />
                  <TipoBadge id={c.tipo} />
                  {c.origen === "auto" && <span className="inline-flex h-5 items-center rounded-full border px-2 text-[11px] text-muted-foreground" title="Lo generó el sistema automático">Auto</span>}
                  <span className="text-[11px] text-muted-foreground">{c.slides} slides · {fechaCorta(c.updated_at)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <NuevoCarrusel abierto={nuevo} onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); onAbrir(id); }} />
    </div>
  );
}
