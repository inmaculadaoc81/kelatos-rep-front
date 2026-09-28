"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { nombreTipo, urlImagen, type Slide } from "./use-social";

function Miniatura({ slide, carruselId, activa, onElegir, bloqueada }: { slide: Slide; carruselId: number; activa: boolean; onElegir: () => void; bloqueada: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id, disabled: bloqueada });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative w-[92px] shrink-0 rounded-lg border bg-card p-1", activa ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted/50", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      <button type="button" onClick={onElegir} title={`${nombreTipo(slide.type)}: ${slide.headline}`} className="block w-full text-left">
        <div className="aspect-[4/5] w-full overflow-hidden rounded bg-muted">
          {slide.rendered ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlImagen(carruselId, slide.id, slide.version, slide.updated_at)} alt={`Slide ${slide.position}`} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">sin dibujar</div>
          )}
        </div>
        <p className="mt-1 truncate text-[10px] font-semibold tabular-nums text-muted-foreground">{String(slide.position).padStart(2, "0")} · {nombreTipo(slide.type)}</p>
      </button>
      <button
        type="button"
        aria-label={`Mover la slide ${slide.position}`}
        title="Arrastra para reordenar"
        className="absolute top-1.5 left-1.5 flex size-5 cursor-grab touch-none items-center justify-center rounded bg-background/90 text-muted-foreground shadow-sm hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
    </div>
  );
}

/** Tira horizontal de miniaturas que se puede reordenar arrastrando (o con el teclado: espacio, flechas, espacio). */
export function TiraSlides({ slides, carruselId, activa, onElegir, onReordenar, bloqueada }: {
  slides: Slide[];
  carruselId: number;
  activa: number | null;
  onElegir: (id: number) => void;
  onReordenar: (orden: number[]) => void;
  bloqueada: boolean;
}) {
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = slides.map((s) => s.id);

  const alSoltar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const de = ids.indexOf(Number(e.active.id));
    const a = ids.indexOf(Number(e.over.id));
    if (de < 0 || a < 0) return;
    onReordenar(arrayMove(ids, de, a));
  };

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 overflow-x-auto pb-1.5">
          {slides.map((s) => (
            <Miniatura key={s.id} slide={s} carruselId={carruselId} activa={activa === s.id} onElegir={() => onElegir(s.id)} bloqueada={bloqueada} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
