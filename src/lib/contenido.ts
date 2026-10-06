export type EstadoPieza = "pendiente" | "en_proceso" | "listo";
export type TipoPieza = "video" | "reel" | "single_post" | "carrusel" | "pdf";
export type RedSocial = "youtube" | "facebook" | "tiktok" | "instagram" | "x" | "snapchat";

export interface Subtarea {
  id: number;
  piezaId: number;
  titulo: string;
  hecha: boolean;
  orden: number;
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
];

export const REDES: { valor: RedSocial; etiqueta: string }[] = [
  { valor: "youtube", etiqueta: "YouTube" },
  { valor: "facebook", etiqueta: "Facebook" },
  { valor: "tiktok", etiqueta: "TikTok" },
  { valor: "instagram", etiqueta: "Instagram" },
  { valor: "x", etiqueta: "X" },
  { valor: "snapchat", etiqueta: "Snapchat" },
];

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
