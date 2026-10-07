export type EstadoPieza = "pendiente" | "en_proceso" | "listo";
export type TipoPieza = "video" | "reel" | "single_post" | "carrusel" | "pdf" | "imagen";
export type RedSocial = "youtube" | "facebook" | "tiktok" | "instagram" | "x" | "snapchat" | "linkedin";

export interface Subtarea {
  id: number;
  piezaId: number;
  titulo: string;
  hecha: boolean;
  orden: number;
}

/** Recurso que la community manager pide a otra persona. Su estado sale de la
    tarea asignada: recibido cuando esa persona la finaliza. */
export interface Necesidad {
  id: number;
  piezaId: number;
  descripcion: string;
  responsableId: number | null;
  responsableNombre: string | null;
  tareaId: number | null;
  recibido: boolean;
}

export interface Empleado {
  id: number;
  nombre: string;
}

export interface Pieza {
  id: number;
  titulo: string;
  estado: EstadoPieza;
  fechaLimite: string | null;
  tipo: TipoPieza | null;
  redSocial: RedSocial | null;
  descripcion: string | null;
  recursos: string[];
  enlaceSubida: string | null;
  programadaPara: string | null;
  creadoPor: string | null;
  creadoEn: string | null;
  subtareasTotal: number;
  subtareasHechas: number;
  subtareas?: Subtarea[];
  necesidades: Necesidad[];
}

export const ESTADOS: { valor: EstadoPieza; etiqueta: string; color: string }[] = [
  { valor: "pendiente", etiqueta: "Pendiente", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { valor: "en_proceso", etiqueta: "En proceso", color: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  { valor: "listo", etiqueta: "Listo", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
];

export const TIPOS: { valor: TipoPieza; etiqueta: string }[] = [
  { valor: "video", etiqueta: "Video" },
  { valor: "reel", etiqueta: "Reel" },
  { valor: "single_post", etiqueta: "Single post" },
  { valor: "carrusel", etiqueta: "Carrusel" },
  { valor: "pdf", etiqueta: "PDF" },
  { valor: "imagen", etiqueta: "Imagen" },
];

export const REDES: { valor: RedSocial; etiqueta: string; color: string }[] = [
  { valor: "youtube", etiqueta: "YouTube", color: "bg-red-500/10 text-red-700 dark:text-red-400" },
  { valor: "facebook", etiqueta: "Facebook", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { valor: "tiktok", etiqueta: "TikTok", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  { valor: "instagram", etiqueta: "Instagram", color: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400" },
  { valor: "x", etiqueta: "X", color: "bg-neutral-500/10 text-neutral-700 dark:text-neutral-300" },
  { valor: "snapchat", etiqueta: "Snapchat", color: "bg-yellow-500/10 text-yellow-800 dark:text-yellow-500" },
  { valor: "linkedin", etiqueta: "LinkedIn", color: "bg-sky-700/10 text-sky-800 dark:text-sky-400" },
];

/** Color de una red social por valor — "" (sin red asignada) o un valor sin
    entrada en REDES cae a un gris neutro, nunca a un color con significado
    propio ya usado para otra cosa. */
export function colorDeRed(red: RedSocial | null | undefined): string {
  return REDES.find((r) => r.valor === red)?.color ?? "bg-muted text-muted-foreground";
}

export function etiquetaDe<T extends string>(lista: { valor: T; etiqueta: string }[], valor: T | null | undefined): string {
  return lista.find((x) => x.valor === valor)?.etiqueta ?? "—";
}

/** Fecha y hora para un input datetime-local (hora local del navegador). */
export function aInputFechaHora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
