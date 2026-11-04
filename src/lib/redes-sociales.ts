import type { Pieza, RedSocial } from "@/lib/contenido";

/**
 * Lo que cuenta como «subido» y «pendiente de subir» en el panel de Redes sociales (sobre las piezas de Contenido):
 *  · subida: la pieza ya tiene el enlace de su vídeo;
 *  · pendiente de subir: un vídeo o reel que todavía no tiene enlace;
 *  · en curso: carruseles, posts e imágenes que aún no están «listos».
 */
const ES_VIDEO = (p: Pieza) => p.tipo === "video" || p.tipo === "reel" || p.tipo === null;

export const estaSubida = (p: Pieza) => Boolean(p.enlaceVideo);
export const pendienteDeSubir = (p: Pieza) => !p.enlaceVideo && ES_VIDEO(p);
export const enCurso = (p: Pieza) => !p.enlaceVideo && !ES_VIDEO(p) && p.estado !== "listo";

export type VistaContenido = "pendientes" | "subidos" | "en_curso" | "todas";

export const FILTROS_VISTA: Record<VistaContenido, (p: Pieza) => boolean> = {
  pendientes: pendienteDeSubir,
  subidos: estaSubida,
  en_curso: enCurso,
  todas: () => true,
};

/** Redes que cubre cada valor de `redSocial` (las combinaciones cuentan en cada una de sus redes). */
export const REDES_DE: Record<RedSocial, ("youtube" | "facebook" | "instagram" | "tiktok" | "otra")[]> = {
  youtube: ["youtube"],
  facebook: ["facebook"],
  instagram: ["instagram"],
  tiktok: ["tiktok"],
  y_f_i_t: ["youtube", "facebook", "instagram", "tiktok"],
  y_f_i: ["youtube", "facebook", "instagram"],
  x: ["otra"],
  snapchat: ["otra"],
  linkedin: ["otra"],
};

export const NOMBRE_RED: Record<string, string> = { youtube: "YouTube", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", otra: "Otras" };

export function fechaPieza(p: Pieza): string {
  const iso = p.programadaPara ?? p.creadoEn;
  return iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

/** Piezas programadas entre ahora y dentro de `dias` días. */
export function programadasProximas(piezas: Pieza[], dias = 7): Pieza[] {
  const ahora = Date.now();
  const limite = ahora + dias * 86_400_000;
  return piezas
    .filter((p) => p.programadaPara && new Date(p.programadaPara).getTime() >= ahora && new Date(p.programadaPara).getTime() <= limite)
    .sort((a, b) => String(a.programadaPara).localeCompare(String(b.programadaPara)));
}
