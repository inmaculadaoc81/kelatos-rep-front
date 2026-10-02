"use client";

import { useEffect } from "react";
import { useV2 } from "@/components/agentes-v2/use-v2";
import { leerOrganizacionActual } from "../../../organizacion-context";
import type { ContenidoSlide, Diseno, EstadoCarrusel } from "./use-social";

export const LAYOUT_TIPOS = ["educational_card", "single_image", "quote", "statistic", "promotional_card", "announcement", "testimonial", "case_study"] as const;
export type LayoutTipo = (typeof LAYOUT_TIPOS)[number];

export const LAYOUTS: { valor: LayoutTipo; texto: string; ayuda: string }[] = [
  { valor: "educational_card", texto: "Tarjeta educativa", ayuda: "Un titular y una explicación corta" },
  { valor: "single_image", texto: "Imagen única", ayuda: "Igual que la tarjeta, pensada para una sola idea" },
  { valor: "quote", texto: "Cita", ayuda: "Una frase real, con autor" },
  { valor: "statistic", texto: "Dato / estadística", ayuda: "Una cifra real con su explicación" },
  { valor: "promotional_card", texto: "Promoción", ayuda: "Una oferta o gancho, con botón" },
  { valor: "announcement", texto: "Anuncio", ayuda: "Un aviso en pocas palabras" },
  { valor: "testimonial", texto: "Testimonio", ayuda: "Una cita real de un cliente" },
  { valor: "case_study", texto: "Antes / después", ayuda: "Dos columnas: problema y solución" },
];

/** A qué tipo de slide del renderer se traduce cada layout (igual que el backend, `esquemasPosts.js::LAYOUT_A_SLIDE`). */
export const LAYOUT_A_TIPO: Record<LayoutTipo, string> = {
  educational_card: "body_card",
  single_image: "body_card",
  quote: "body_quote",
  statistic: "body_stat",
  promotional_card: "cover",
  announcement: "cover",
  testimonial: "body_quote",
  case_study: "body_comparison",
};

export const PLATAFORMAS_POST = ["instagram", "facebook", "linkedin", "x"] as const;
export type PlataformaPost = (typeof PLATAFORMAS_POST)[number];
export const NOMBRE_PLATAFORMA: Record<PlataformaPost, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", x: "X" };

export interface JobPost {
  state: "running" | "done" | "error";
  accion: string;
  etapa: string;
  detalle: string;
  progreso: number;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

export interface VariantePlataforma { headline: string; body: string; cta: string | null; hashtags: string[] }
export type PlatformVariants = Partial<Record<PlataformaPost, VariantePlataforma>>;

export interface PostResumen {
  id: number;
  topic: string;
  objective: string;
  layout_type: LayoutTipo;
  platform_primary: string;
  format: string;
  title: string;
  headline: string;
  status: EstadoCarrusel;
  tipo: string | null;
  origen: "manual" | "auto";
  approval_id: number | null;
  hashtags: string[];
  platform_variants: PlatformVariants;
  version: number;
  updated_at: string;
  generated_at: string | null;
  approved_at: string | null;
  rendered: boolean;
  job: JobPost | null;
}

export interface DetallePost {
  ok: boolean;
  post: PostResumen & { audience: string | null; cta: string | null; body: string | null; content: ContenidoSlide; design_spec: Diseno; brand_name?: string; format_info?: { width: number; height: number; etiqueta: string } | null };
  rendered: boolean;
  bytes: number;
  width: number | null;
  height: number | null;
  job: JobPost | null;
}

export interface PanelPosts { ok: boolean; posts: { total: number; draft: number; generated: number; review: number; approved: number } }

/** `sello` evita ver la imagen anterior en caché al volver a dibujar con el mismo número de versión. Lleva
    `organization_id` (ver urlImagen en use-social.ts: mismo bug, misma solución). */
export const urlImagenPost = (postId: number, version: number, sello?: string) => {
  const org = leerOrganizacionActual();
  return `/api/agentes-v2/social/posts/${postId}/image?v=${version}${sello ? `&t=${new Date(sello).getTime()}` : ""}${org ? `&organization_id=${org}` : ""}`;
};

function useSondeo(hayTrabajo: boolean, recargar: () => void) {
  useEffect(() => {
    if (!hayTrabajo) return;
    const t = setInterval(recargar, 3000);
    return () => clearInterval(t);
  }, [hayTrabajo, recargar]);
}

export function usePosts() {
  const r = useV2<{ ok: boolean; posts: PostResumen[] }>("social/posts");
  useSondeo(!!r.datos?.posts.some((p) => p.job?.state === "running"), r.recargar);
  return r;
}

export function usePost(id: number) {
  const r = useV2<DetallePost>(`social/posts/${id}`);
  useSondeo(r.datos?.job?.state === "running", r.recargar);
  return r;
}

export function usePanelPosts() {
  return useV2<PanelPosts>("social/posts/panel");
}

export type { ContenidoSlide, Diseno };
