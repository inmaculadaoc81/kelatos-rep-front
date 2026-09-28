"use client";

import { useState } from "react";
import { Add } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { CargandoFilas, ErrorCaja, Vacio } from "@/components/agentes-v2/componentes";
import { cn } from "@/lib/utils";
import { Progreso, fechaCorta } from "./campos";
import { NuevoReel } from "./nuevo-reel";
import { ESTADO_REEL_TEXTO, formatoTiempo, useReels, type EstadoReel } from "./use-reels";

const FILTROS: { valor: EstadoReel | "todos"; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "draft", texto: "Borradores" },
  { valor: "planning", texto: "Escribiendo guion" },
  { valor: "generating", texto: "Escenas listas" },
];

export function ReelsLista({ onAbrir }: { onAbrir: (id: number) => void }) {
  const { datos, error, cargando } = useReels();
  const [filtro, setFiltro] = useState<EstadoReel | "todos">("todos");
  const [nuevo, setNuevo] = useState(false);

  const lista = (datos?.reels ?? []).filter((r) => filtro === "todos" || r.status === filtro);

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
        <Button size="sm" className="ml-auto" onClick={() => setNuevo(true)}><Add className="size-4" />Nuevo Reel</Button>
      </div>

      {error && <ErrorCaja mensaje={error} />}
      {!datos && cargando && <CargandoFilas />}
      {datos && lista.length === 0 && (
        <Vacio
          titulo={filtro === "todos" ? "Todavía no hay reels" : "No hay reels en ese estado"}
          texto={filtro === "todos" ? "Pulsa «Nuevo Reel», escribe el tema y la IA prepara el guion, las escenas y los subtítulos." : undefined}
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {lista.map((r) => {
          const trabajando = r.job?.state === "running";
          const e = ESTADO_REEL_TEXTO[r.status] ?? ESTADO_REEL_TEXTO.draft;
          return (
            <button key={r.id} onClick={() => onAbrir(r.id)} className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md">
              <div className="relative flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 bg-muted p-4 text-center">
                {trabajando ? (
                  <>
                    <p className="text-xs font-medium text-foreground">{r.job?.etapa}</p>
                    <div className="w-full"><Progreso valor={r.job?.progreso ?? 0} /></div>
                  </>
                ) : r.hook ? (
                  <p className="line-clamp-6 text-sm leading-snug text-foreground">{r.hook}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin guion todavía</p>
                )}
                <span className="absolute right-2 bottom-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground shadow-sm">{formatoTiempo(r.duration_seconds)}</span>
              </div>
              <div className="space-y-1.5 p-3">
                <p className="line-clamp-2 text-sm leading-snug font-medium">{r.title}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", e.clase)}>{e.texto}</span>
                  <span className="text-[11px] text-muted-foreground">{r.escenas} escenas · {fechaCorta(r.updated_at)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <NuevoReel abierto={nuevo} onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); onAbrir(id); }} />
    </div>
  );
}
