"use client";

import { useEffect, useRef, useState } from "react";
import { useV2 } from "@/components/agentes-v2/use-v2";

export type EstadoCarrusel = "draft" | "generated" | "review" | "approved" | "scheduled" | "published" | "rejected";
export type TipoSlide = "cover" | "body_card" | "body_stat" | "body_step" | "body_comparison" | "body_list" | "body_quote" | "image_text" | "grid" | "cta";

export const TIPOS: { valor: TipoSlide; nombre: string; ayuda: string }[] = [
  { valor: "cover", nombre: "Portada", ayuda: "Gancho de la primera slide" },
  { valor: "body_card", nombre: "Tarjeta", ayuda: "Una idea con título y texto" },
  { valor: "body_stat", nombre: "Dato", ayuda: "Una cifra grande con su explicación" },
  { valor: "body_step", nombre: "Paso", ayuda: "Un paso numerado" },
  { valor: "body_comparison", nombre: "Comparación", ayuda: "Dos columnas: antes / después" },
  { valor: "body_list", nombre: "Lista", ayuda: "De 3 a 5 puntos" },
  { valor: "body_quote", nombre: "Cita", ayuda: "Una frase destacada" },
  { valor: "image_text", nombre: "Imagen + texto", ayuda: "Imagen subida con texto" },
  { valor: "grid", nombre: "Cuadrícula", ayuda: "De 4 a 6 celdas" },
  { valor: "cta", nombre: "Llamada a la acción", ayuda: "Cierre con botón" },
];

export const nombreTipo = (t: string) => TIPOS.find((x) => x.valor === t)?.nombre ?? t;

/** Límites de texto pensados para leerse en el móvil (los mismos que aplica el servidor). */
export const LIMITES = {
  headline: (tipo: string) => (tipo === "cover" || tipo === "cta" ? 70 : tipo === "body_stat" ? 50 : 60),
  body: (tipo: string) => (tipo === "cover" || tipo === "cta" ? 140 : 180),
  itemLista: 60,
  compTitulo: 30,
  compPunto: 50,
  celdaTitulo: 28,
  celdaTexto: 60,
  cita: 160,
  autor: 40,
  statValor: 14,
  statEtiqueta: 50,
  boton: 28,
  caption: 1200,
  hashtags: 15,
};

export interface JobSocial {
  state: "running" | "done" | "error";
  accion: string;
  etapa: string;
  detalle: string;
  progreso: number;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

export interface CarruselResumen {
  id: number;
  title: string;
  topic: string;
  objective: string;
  platform: string;
  format: string;
  slide_count: number;
  status: EstadoCarrusel;
  approval_id: number | null;
  caption: string | null;
  hashtags: string[] | null;
  updated_at: string;
  generated_at: string | null;
  approved_at: string | null;
  slides: number;
  cover_slide_id: number | null;
  cover_version: number | null;
  job: JobSocial | null;
}

export interface ContenidoSlide {
  items?: string[] | null;
  stat?: { value: string; label: string } | null;
  left?: { title: string; points: string[] } | null;
  right?: { title: string; points: string[] } | null;
  cells?: { title: string; text?: string | null }[] | null;
  quote?: { text: string; author?: string | null } | null;
  step?: { number: number } | null;
  image?: { assetId?: number | null } | null;
  handle?: string | null;
}

export interface Forma {
  kind: "circle" | "ring" | "blob" | "bar" | "dots" | "grid" | "diagonal";
  at: "tl" | "tr" | "bl" | "br" | "c" | "l" | "r";
  size: "s" | "m" | "l";
  tone: "accent" | "soft" | "contrast";
}

export interface Diseno {
  variant: "a" | "b" | "c";
  palette: "brand" | "dark" | "light" | "accent" | "soft";
  align: "left" | "center";
  scale: "xl" | "l" | "m";
  compact: boolean;
  shapes: Forma[];
  icon: string | null;
  emphasis: "none" | "underline" | "highlight";
  imageFit: "cover" | "contain";
}

export interface Slide {
  id: number;
  position: number;
  type: TipoSlide;
  headline: string;
  body: string | null;
  cta: string | null;
  visual_direction: string | null;
  content: ContenidoSlide;
  design_spec: Diseno;
  version: number;
  updated_at: string;
  rendered: boolean;
  bytes: number;
  versions: { version: number; reason: string | null; created_at: string; has_render: boolean }[];
}

export interface DetalleCarrusel {
  ok: boolean;
  carousel: CarruselResumen & { brand_name?: string; format_info?: { width: number; height: number; etiqueta: string } | null };
  slides: Slide[];
  job: JobSocial | null;
}

export interface Marca {
  name: string;
  handle: string | null;
  logoAssetId: number | null;
  colors: { primary: string; secondary: string; accent: string; dark: string; light: string };
  fonts: { heading: string; body: string };
  radius: "none" | "sm" | "md" | "lg" | "pill";
  spacing: "compact" | "normal" | "airy";
  visualStyle: "minimal" | "bold" | "editorial" | "playful" | "tech";
  tone: string;
}

export const FUENTES = ["Inter", "Poppins", "Playfair Display", "Space Grotesk", "Montserrat", "DM Serif Display", "Lora"];

export interface PanelSocial {
  ok: boolean;
  carruseles: { total: number; draft: number; generated: number; review: number; approved: number };
  formatos: Record<string, { width: number; height: number; etiqueta: string; disponible: boolean }>;
  render: { ok: boolean; motivo?: string };
}

export const ESTADO_TEXTO: Record<EstadoCarrusel, { texto: string; clase: string }> = {
  draft: { texto: "Borrador", clase: "bg-muted text-muted-foreground" },
  generated: { texto: "Generado", clase: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  review: { texto: "En revisión", clase: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  approved: { texto: "Aprobado", clase: "bg-green-500/15 text-green-700 dark:text-green-300" },
  scheduled: { texto: "Programado", clase: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  published: { texto: "Publicado", clase: "bg-green-600/20 text-green-800 dark:text-green-200" },
  rejected: { texto: "Rechazado", clase: "bg-red-500/10 text-red-700 dark:text-red-300" },
};

/** `sello` (la fecha de la slide) evita ver una imagen antigua en caché cuando se vuelve a dibujar con el mismo número de versión. */
export const urlImagen = (carruselId: number, slideId: number, version: number, sello?: string) =>
  `/api/agentes-v2/social/carousels/${carruselId}/slides/${slideId}/image?v=${version}${sello ? `&t=${new Date(sello).getTime()}` : ""}`;

/** Vuelve a consultar cada pocos segundos mientras haya una generación en marcha. */
function useSondeo(hayTrabajo: boolean, recargar: () => void) {
  useEffect(() => {
    if (!hayTrabajo) return;
    const t = setInterval(recargar, 3000);
    return () => clearInterval(t);
  }, [hayTrabajo, recargar]);
}

export function useCarruseles() {
  const r = useV2<{ ok: boolean; carousels: CarruselResumen[] }>("social/carousels");
  useSondeo(!!r.datos?.carousels.some((c) => c.job?.state === "running"), r.recargar);
  return r;
}

export function useCarrusel(id: number) {
  const r = useV2<DetalleCarrusel>(`social/carousels/${id}`);
  useSondeo(r.datos?.job?.state === "running", r.recargar);
  return r;
}

export interface Previa { url: string | null; cargando: boolean; desborda: boolean; error: string | null }
const SIN_PREVIA: Previa = { url: null, cargando: false, desborda: false, error: null };

/**
 * Vista previa en vivo: con cambios sin guardar pide al servidor que dibuje la slide (sin crear versión).
 * Espera a que se deje de escribir y descarta respuestas antiguas.
 */
export function usePrevia(carruselId: number, slideId: number, cambios: object | null): Previa {
  const [previa, setPrevia] = useState<{ clave: string; datos: Previa } | null>(null);
  const urlActual = useRef<string | null>(null);
  const clave = cambios ? `${slideId}:${JSON.stringify(cambios)}` : null;

  useEffect(() => {
    if (!clave || !cambios) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setPrevia((p) => ({ clave, datos: { ...(p?.datos ?? SIN_PREVIA), cargando: true, error: null } }));
      try {
        const res = await fetch(`/api/agentes-v2/social/carousels/${carruselId}/slides/${slideId}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cambios),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error || `Error ${res.status}`);
        }
        const url = URL.createObjectURL(await res.blob());
        if (urlActual.current) URL.revokeObjectURL(urlActual.current);
        urlActual.current = url;
        setPrevia({ clave, datos: { url, cargando: false, desborda: res.headers.get("x-overflow") === "1", error: null } });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setPrevia((p) => ({ clave, datos: { ...(p?.datos ?? SIN_PREVIA), cargando: false, error: e instanceof Error ? e.message : "No se pudo dibujar la vista previa" } }));
      }
    }, 800);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, carruselId, slideId]);

  useEffect(() => () => { if (urlActual.current) URL.revokeObjectURL(urlActual.current); }, []);

  if (!clave || !previa) return SIN_PREVIA;
  // Mientras llega la primera imagen de estos cambios se sigue mostrando la anterior de esta misma slide.
  return previa.clave.split(":")[0] === clave.split(":")[0] ? previa.datos : SIN_PREVIA;
}
