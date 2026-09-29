"use client";

import { useMemo, useState } from "react";
import { Profile2User } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useTareas } from "../use-tareas";
import { TarjetaTarea, iniciales } from "../tarjeta-tarea";
import { TareaDetalleDialog } from "../tarea-detalle-dialog";

export default function PorPersonaTareasPage() {
  const { tareas, empleados, cargando, actualizarEnLista, quitarDeLista } = useTareas();
  const [tareaAbiertaId, setTareaAbiertaId] = useState<number | null>(null);

  const nombrePorEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of empleados) if (e.email) m.set(e.email, e.nombre);
    return m;
  }, [empleados]);

  // Grupo por persona, cada uno con sus tareas activas primero (pendiente/en
  // progreso) y las finalizadas al final — más útil de un vistazo que el
  // orden de creación.
  const grupos = useMemo(() => {
    const m = new Map<string, { nombre: string; tareas: typeof tareas }>();
    for (const t of tareas) {
      const clave = t.asignadoA || "__sin_asignar__";
      const nombre = t.asignadoA ? (nombrePorEmail.get(t.asignadoA) || t.asignadoA) : "Sin asignar";
      if (!m.has(clave)) m.set(clave, { nombre, tareas: [] });
      m.get(clave)!.tareas.push(t);
    }
    for (const g of m.values()) {
      g.tareas.sort((a, b) => (a.estado === "finalizada" ? 1 : 0) - (b.estado === "finalizada" ? 1 : 0));
    }
    return [...m.values()].sort((a, b) => b.tareas.length - a.tareas.length);
  }, [tareas, nombrePorEmail]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Por persona</h1>
        <p className="text-sm text-muted-foreground">Las mismas tareas, agrupadas por quién las tiene asignadas.</p>
      </div>

      {cargando ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" />
        </div>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay ninguna tarea creada.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grupos.map((g) => (
            <div key={g.nombre} className="space-y-2.5 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2 px-1">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {g.nombre === "Sin asignar" ? <Profile2User className="size-3.5" /> : iniciales(g.nombre)}
                </span>
                <span className="text-sm font-semibold">{g.nombre}</span>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{g.tareas.length}</span>
              </div>
              <div className="space-y-2">
                {g.tareas.map((t) => (
                  <TarjetaTarea key={t.id} tarea={t} nombreAsignado={null} onClick={() => setTareaAbiertaId(t.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TareaDetalleDialog
        tareaId={tareaAbiertaId}
        open={tareaAbiertaId !== null}
        onOpenChange={(o) => !o && setTareaAbiertaId(null)}
        empleados={empleados}
        onCambiada={actualizarEnLista}
        onEliminada={quitarDeLista}
      />
    </div>
  );
}
