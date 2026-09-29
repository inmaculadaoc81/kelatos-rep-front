"use client";

import { Calendar } from "@/lib/icons";
import type { Tarea } from "@/lib/tareas";

export function fmtCorta(f: string | null) {
  if (!f) return "";
  return new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/** Tarjeta compacta de una tarea — misma pieza reutilizada en Tablero, Por
    persona y Calendario, para que una tarea se vea igual en cualquier vista. */
export function TarjetaTarea({ tarea, nombreAsignado, onClick }: { tarea: Tarea; nombreAsignado: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full space-y-2 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <p className="text-sm font-medium leading-snug">{tarea.titulo}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          {fmtCorta(tarea.fechaInicio)}{tarea.fechaFin ? ` → ${fmtCorta(tarea.fechaFin)}` : ""}
        </div>
        {tarea.numNotas > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tarea.numNotas} nota{tarea.numNotas !== 1 ? "s" : ""}</span>
        )}
      </div>
      {nombreAsignado && (
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
            {iniciales(nombreAsignado)}
          </span>
          <span className="truncate text-xs text-muted-foreground">{nombreAsignado}</span>
        </div>
      )}
    </button>
  );
}
