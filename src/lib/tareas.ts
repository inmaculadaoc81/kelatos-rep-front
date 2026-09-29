// Tareas — gestión de tareas del equipo (gestionTareas.js en el backend). Tipos +
// mapeo snake_case→camelCase, mismo patrón que facturas-recibidas.ts.

export type EstadoTarea = "pendiente" | "en_progreso" | "finalizada";
export type PrioridadTarea = "alta" | "media" | "baja";

export const ETIQUETA_ESTADO: Record<EstadoTarea, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  finalizada: "Finalizada",
};

export const ETIQUETA_PRIORIDAD: Record<PrioridadTarea, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

/** Color del punto de prioridad en la tarjeta — solo "alta" llama la atención
    de verdad (rojo), "media" es el valor por defecto (neutro), "baja" queda
    discreta. Mismo criterio que usan la mayoría de gestores de tareas. */
export const COLOR_PRIORIDAD: Record<PrioridadTarea, string> = {
  alta: "bg-rose-500",
  media: "bg-slate-400",
  baja: "bg-sky-300",
};

export interface NotaTarea {
  id: number;
  fecha: string;
  texto: string;
  creadoPor: string;
  creadoEn: string;
}

export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string | null;
  asignadoA: string | null;
  creadoPor: string;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  etiquetas: string[];
  fechaInicio: string;
  fechaFin: string | null;
  creadoEn: string;
  actualizadoEn: string;
  numNotas: number;
  notas?: NotaTarea[];
}

interface FilaNota {
  id: number | string;
  fecha: string;
  texto: string;
  creado_por: string;
  creado_en: string;
}

interface FilaTarea {
  id: number | string;
  titulo: string;
  descripcion: string | null;
  asignado_a: string | null;
  creado_por: string;
  estado: string;
  prioridad?: string;
  etiquetas?: string[];
  fecha_inicio: string;
  fecha_fin: string | null;
  creado_en: string;
  actualizado_en: string;
  num_notas: number | string;
  notas?: FilaNota[];
}

export function mapearNota(n: FilaNota): NotaTarea {
  return { id: Number(n.id), fecha: n.fecha, texto: n.texto, creadoPor: n.creado_por, creadoEn: n.creado_en };
}

export function mapearTarea(f: FilaTarea): Tarea {
  return {
    id: Number(f.id), titulo: f.titulo, descripcion: f.descripcion, asignadoA: f.asignado_a,
    creadoPor: f.creado_por, estado: (f.estado as EstadoTarea) || "pendiente",
    prioridad: (f.prioridad as PrioridadTarea) || "media", etiquetas: Array.isArray(f.etiquetas) ? f.etiquetas : [],
    fechaInicio: f.fecha_inicio, fechaFin: f.fecha_fin, creadoEn: f.creado_en, actualizadoEn: f.actualizado_en,
    numNotas: Number(f.num_notas) || 0, notas: f.notas ? f.notas.map(mapearNota) : undefined,
  };
}
