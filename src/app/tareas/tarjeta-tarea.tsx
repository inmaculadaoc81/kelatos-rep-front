"use client";

import { cn } from "@/lib/utils";
import { Calendar } from "@/lib/icons";
import { COLOR_PRIORIDAD, type Tarea } from "@/lib/tareas";
import type { EmpleadoTareas } from "@/app/api/tareas/empleados/route";

export function fmtCorta(f: string | null) {
  if (!f) return "";
  return new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/** Antigüedad de la tarea por su fecha de inicio: el borde izquierdo y el fondo cambian de color para distinguir lo reciente de lo antiguo. */
export const ANTIGUEDAD = [
  { id: "hoy", etiqueta: "Hoy", borde: "border-l-emerald-500", fondo: "bg-emerald-500/5", punto: "bg-emerald-500" },
  { id: "reciente", etiqueta: "1–3 días", borde: "border-l-sky-500", fondo: "bg-sky-500/5", punto: "bg-sky-500" },
  { id: "semana", etiqueta: "4–7 días", borde: "border-l-amber-500", fondo: "bg-amber-500/5", punto: "bg-amber-500" },
  { id: "antigua", etiqueta: "Más de 7 días", borde: "border-l-slate-400", fondo: "bg-slate-500/5", punto: "bg-slate-400" },
] as const;

export function antiguedad(fechaInicio: string | null) {
  if (!fechaInicio) return ANTIGUEDAD[3];
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const dias = Math.round((inicioHoy - new Date(fechaInicio + "T00:00:00").getTime()) / 86_400_000);
  return dias <= 0 ? ANTIGUEDAD[0] : dias <= 3 ? ANTIGUEDAD[1] : dias <= 7 ? ANTIGUEDAD[2] : ANTIGUEDAD[3];
}

/** Tarjeta compacta de una tarea — misma pieza reutilizada en Tablero, Por
    persona y Calendario, para que una tarea se vea igual en cualquier vista. */
export function TarjetaTarea({ tarea, asignado, onClick }: { tarea: Tarea; asignado: EmpleadoTareas | null; onClick: () => void }) {
  const edad = antiguedad(tarea.fechaInicio);
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Iniciada: ${edad.etiqueta.toLowerCase()}`}
      className={cn("w-full space-y-2 rounded-lg border border-l-4 bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40", edad.borde, edad.fondo)}
    >
      <div className="flex items-start gap-1.5">
        <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", COLOR_PRIORIDAD[tarea.prioridad])} title={`Prioridad ${tarea.prioridad}`} />
        <p className="text-sm font-medium leading-snug">{tarea.titulo}</p>
      </div>

      {tarea.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tarea.etiquetas.slice(0, 3).map((et) => (
            <span key={et} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{et}</span>
          ))}
          {tarea.etiquetas.length > 3 && <span className="text-[10px] text-muted-foreground">+{tarea.etiquetas.length - 3}</span>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          {fmtCorta(tarea.fechaInicio)}{tarea.fechaFin ? ` → ${fmtCorta(tarea.fechaFin)}` : ""}
        </div>
        {tarea.numNotas > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tarea.numNotas} nota{tarea.numNotas !== 1 ? "s" : ""}</span>
        )}
      </div>

      {asignado && (
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
            {iniciales(asignado.nombre)}
          </span>
          <span className="truncate text-xs text-muted-foreground">{asignado.nombre}</span>
          {asignado.trabajaRemoto && (
            <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-700 dark:text-violet-400">Remoto</span>
          )}
        </div>
      )}
    </button>
  );
}
