"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { urlImagen, usePrevia, type Slide } from "./use-social";

/** Slide grande con flechas, y pantalla completa para revisarla como se verá en el móvil. */
export function VistaPrevia({ slides, activa, carruselId, ratio, cambios, onElegir, onDuplicar, onEliminar, bloqueado }: {
  slides: Slide[];
  activa: Slide;
  carruselId: number;
  ratio: number;
  cambios: object | null;
  onElegir: (id: number) => void;
  onDuplicar: () => void;
  onEliminar: () => void;
  bloqueado: boolean;
}) {
  const [completa, setCompleta] = useState(false);
  const i = slides.findIndex((s) => s.id === activa.id);
  const ir = (d: number) => {
    const n = slides[i + d];
    if (n) onElegir(n.id);
  };

  useEffect(() => {
    if (!completa) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") ir(-1);
      if (e.key === "ArrowRight") ir(1);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completa, i, slides]);

  const guardada = activa.rendered ? urlImagen(carruselId, activa.id, activa.version, activa.updated_at) : null;
  const previa = usePrevia(carruselId, activa.id, cambios);
  const imagen = cambios && previa.url ? previa.url : guardada;
  const marco = (
    <div className="relative w-full overflow-hidden rounded-lg border bg-muted shadow-sm" style={{ aspectRatio: String(ratio) }}>
      {cambios && (
        <span className="absolute top-2 left-2 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
          {previa.cargando ? "Actualizando vista previa…" : "Vista previa · sin guardar"}
        </span>
      )}
      {imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagen} alt={`Slide ${activa.position}: ${activa.headline}`} className="size-full object-contain" />
      ) : (
        <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">Esta slide todavía no está dibujada.</div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {marco}
      {cambios && previa.desborda && <p className="text-[11px] text-amber-700 dark:text-amber-300">Este texto no cabe entero: al guardar se reducirá el tamaño de letra para que entre.</p>}
      {cambios && previa.error && <p className="text-[11px] text-red-600">{previa.error}</p>}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" disabled={i <= 0} onClick={() => ir(-1)} title="Slide anterior"><ChevronLeft className="size-4" /></Button>
          <span className="w-14 text-center text-xs tabular-nums text-muted-foreground">{i + 1} / {slides.length}</span>
          <Button variant="outline" size="icon" className="size-8" disabled={i >= slides.length - 1} onClick={() => ir(1)} title="Slide siguiente"><ChevronRight className="size-4" /></Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" disabled={!imagen} onClick={() => setCompleta(true)} title="Pantalla completa"><Maximize2 className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8" disabled={bloqueado || slides.length >= 12} onClick={onDuplicar} title="Duplicar esta slide"><Copy className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8 text-red-600" disabled={bloqueado || slides.length <= 3} onClick={onEliminar} title={slides.length <= 3 ? "Un carrusel necesita al menos 3 slides" : "Eliminar esta slide"}><Trash2 className="size-4" /></Button>
        </div>
      </div>

      <Dialog open={completa} onOpenChange={setCompleta}>
        <DialogContent className="flex max-h-[96vh] w-auto max-w-[96vw] flex-col items-center gap-2 p-3 sm:max-w-[96vw]">
          <DialogTitle className="sr-only">Slide {activa.position}</DialogTitle>
          <DialogDescription className="sr-only">Vista ampliada. Usa las flechas del teclado para cambiar de slide.</DialogDescription>
          {imagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagen} alt={`Slide ${activa.position}`} className="max-h-[84vh] w-auto rounded-md object-contain" />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" disabled={i <= 0} onClick={() => ir(-1)}><ChevronLeft className="size-4" /></Button>
            <span className="text-xs tabular-nums text-muted-foreground">{i + 1} / {slides.length}</span>
            <Button variant="outline" size="icon" className="size-8" disabled={i >= slides.length - 1} onClick={() => ir(1)}><ChevronRight className="size-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
