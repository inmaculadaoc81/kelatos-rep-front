"use client";

import { useEffect } from "react";
import { useV2 } from "@/components/agentes-v2/use-v2";
import type { ContenidoSlide, Diseno } from "./use-social";

export const DURACIONES_REEL = [15, 30, 45, 60] as const;
export type DuracionReel = (typeof DURACIONES_REEL)[number];

export const PLATAFORMAS_REEL = ["instagram", "tiktok", "youtube_shorts"] as const;
export type PlataformaReel = (typeof PLATAFORMAS_REEL)[number];
export const NOMBRE_PLATAFORMA_REEL: Record<PlataformaReel, string> = { instagram: "Instagram", tiktok: "TikTok", youtube_shorts: "YouTube Shorts" };

export type EstadoReel = "draft" | "planning" | "generating" | "rendering" | "qa" | "review" | "approved" | "scheduled" | "published" | "failed";
export const ESTADO_REEL_TEXTO: Record<EstadoReel, { texto: string; clase: string }> = {
  draft: { texto: "Borrador", clase: "bg-muted text-muted-foreground" },
  planning: { texto: "Escribiendo guion", clase: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  generating: { texto: "Escenas listas", clase: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  rendering: { texto: "Renderizando vídeo", clase: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  qa: { texto: "Control de calidad", clase: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  review: { texto: "En revisión", clase: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  approved: { texto: "Aprobado", clase: "bg-green-500/15 text-green-700 dark:text-green-300" },
  scheduled: { texto: "Programado", clase: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  published: { texto: "Publicado", clase: "bg-green-600/20 text-green-800 dark:text-green-200" },
  failed: { texto: "Falló", clase: "bg-red-500/10 text-red-700 dark:text-red-300" },
};

export const TIPOS_VISUAL_ESCENA = ["talking_head", "image", "b_roll", "screen_recording", "graphic", "text_animation", "statistic", "quote", "carousel_slide", "product", "logo", "custom_asset"] as const;
export type TipoVisualEscena = (typeof TIPOS_VISUAL_ESCENA)[number];
export const VISUALES_DIBUJABLES: TipoVisualEscena[] = ["graphic", "statistic", "quote", "text_animation", "carousel_slide"];
export const NOMBRE_TIPO_VISUAL: Record<TipoVisualEscena, string> = {
  talking_head: "Persona a cámara", image: "Foto real", b_roll: "Vídeo de apoyo", screen_recording: "Grabación de pantalla",
  graphic: "Gráfico / titular", text_animation: "Texto animado", statistic: "Dato / cifra", quote: "Cita",
  carousel_slide: "Tarjeta de carrusel", product: "Producto", logo: "Logo", custom_asset: "Activo propio",
};

export const TRANSICIONES_REEL = ["cut", "fast_cut", "fade", "slide", "zoom"] as const;
export type TransicionReel = (typeof TRANSICIONES_REEL)[number];
export const NOMBRE_TRANSICION: Record<TransicionReel, string> = { cut: "Corte", fast_cut: "Corte rápido", fade: "Fundido", slide: "Deslizar", zoom: "Zoom" };

export interface JobReel {
  state: "running" | "done" | "error";
  accion: string;
  etapa: string;
  detalle: string;
  progreso: number;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

export interface ReelResumen {
  id: number;
  topic: string;
  objective: string;
  tone: string;
  language: string;
  cta: string | null;
  duration_seconds: DuracionReel;
  platforms: PlataformaReel[];
  title: string;
  hook: string | null;
  hashtags: string[];
  status: EstadoReel;
  qa_result: { passed: boolean; issues: string[] } | null;
  origen: "manual" | "auto";
  approval_id: number | null;
  version: number;
  scheduled_for: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  rendered_at: string | null;
  approved_at: string | null;
  escenas: number;
  job: JobReel | null;
}

export interface EscenaReel {
  id: number;
  position: number;
  duration_seconds: number;
  voiceover: string | null;
  on_screen_text: string | null;
  visual_type: TipoVisualEscena;
  visual_description: string | null;
  transition: TransicionReel;
  asset_id: number | null;
  content: ContenidoSlide;
  design_spec: Diseno;
  dibujable: boolean;
  version: number;
  updated_at: string;
}

export interface DetalleReel {
  ok: boolean;
  reel: ReelResumen & { audience: string | null; script: string | null; subtitles_srt: string | null; subtitles_vtt: string | null; brand_name?: string };
  scenes: EscenaReel[];
  job: JobReel | null;
}

export interface PanelReels { ok: boolean; reels: { total: number; draft: number; planning: number; generating: number } }

export const urlEscenaImagen = (reelId: number, sceneId: number) => `/api/agentes-v2/social/reels/${reelId}/scenes/${sceneId}/image`;
/** `sello` (updated_at) evita ver un vídeo antiguo en caché tras volver a renderizar. */
export const urlVideoReel = (reelId: number, sello?: string) => `/api/agentes-v2/social/reels/${reelId}/video${sello ? `?t=${new Date(sello).getTime()}` : ""}`;

function useSondeo(hayTrabajo: boolean, recargar: () => void) {
  useEffect(() => {
    if (!hayTrabajo) return;
    const t = setInterval(recargar, 3000);
    return () => clearInterval(t);
  }, [hayTrabajo, recargar]);
}

export function useReels() {
  const r = useV2<{ ok: boolean; reels: ReelResumen[] }>("social/reels");
  useSondeo(!!r.datos?.reels.some((x) => x.job?.state === "running"), r.recargar);
  return r;
}

export function useReel(id: number) {
  const r = useV2<DetalleReel>(`social/reels/${id}`);
  useSondeo(r.datos?.job?.state === "running", r.recargar);
  return r;
}

export function usePanelReels() {
  return useV2<PanelReels>("social/reels/panel");
}

const dosDig = (n: number) => String(Math.floor(n)).padStart(2, "0");
export const formatoTiempo = (segundos: number) => `${dosDig(segundos / 60)}:${dosDig(segundos % 60)}`;
