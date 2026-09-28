"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOMBRE_TIPO_VISUAL, urlEscenaImagen, type EscenaReel } from "./use-reels";

function Miniatura({ escena, reelId, activa, onElegir, bloqueada }: { escena: EscenaReel; reelId: number; activa: boolean; onElegir: () => void; bloqueada: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: escena.id, disabled: bloqueada });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative flex items-center gap-2 rounded-lg border bg-card p-1.5", activa ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted/50", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      <button type="button" aria-label={`Mover la escena ${escena.position}`} title="Arrastra para reordenar" className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="size-3.5" />
      </button>
      <button type="button" onClick={onElegir} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <div className="aspect-[9/16] w-10 shrink-0 overflow-hidden rounded bg-muted">
          {escena.dibujable ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlEscenaImagen(reelId, escena.id)} alt={`Escena ${escena.position}`} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground"><Clapperboard className="size-4" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tabular-nums">{String(escena.position).padStart(2, "0")} · {escena.duration_seconds}s</p>
          <p className="truncate text-[11px] text-muted-foreground">{NOMBRE_TIPO_VISUAL[escena.visual_type]}</p>
        </div>
      </button>
    </div>
  );
}

/** Lista vertical de escenas, reordenable arrastrando (o con teclado). */
export function TiraEscenas({ escenas, reelId, activa, onElegir, onReordenar, bloqueada }: {
  escenas: EscenaReel[];
  reelId: number;
  activa: number | null;
  onElegir: (id: number) => void;
  onReordenar: (orden: number[]) => void;
  bloqueada: boolean;
}) {
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = escenas.map((s) => s.id);

  const alSoltar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const de = ids.indexOf(Number(e.active.id));
    const a = ids.indexOf(Number(e.over.id));
    if (de < 0 || a < 0) return;
    onReordenar(arrayMove(ids, de, a));
  };

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {escenas.map((s) => (
            <Miniatura key={s.id} escena={s} reelId={reelId} activa={activa === s.id} onElegir={() => onElegir(s.id)} bloqueada={bloqueada} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
