"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TarjetaSeveridad, type Severidad } from "./seguridad-componentes";

export interface VideoYoutube {
  id: string;
  titulo: string;
  descripcionLongitud: number;
  numTags: number;
  duracionSeg: number | null;
  esShort: boolean;
  vistas: number;
  likes: number;
  comentarios: number;
}

export interface ResumenYoutube {
  configurado?: boolean;
  mensaje?: string;
  canal?: { nombre: string; suscriptores: number; vistasTotales: number; numVideos: number };
  videos?: VideoYoutube[];
}

export interface PublicacionInstagram {
  tipo: string;
  captionLongitud: number;
  tieneHashtags: boolean;
  likes: number;
  comentarios: number;
  fecha: string | null;
}

export interface ResumenInstagram {
  configurado?: boolean;
  mensaje?: string;
  seguidores?: number;
  numPublicaciones?: number;
  publicaciones?: PublicacionInstagram[];
}

export interface ResumenTikTokSnapchat {
  tiktok?: { configurado: boolean; motivo?: string };
  snapchat?: { configurado: boolean; motivo?: string };
}

export interface Recomendaciones {
  youtube: string[];
  instagram: string[];
  tiktok: string[];
  snapchat: string[];
}

export function TarjetaYoutube({ r }: { r?: ResumenYoutube }) {
  if (!r) return <TarjetaSeveridad titulo="YouTube" severidad="sindato"><p className="text-muted-foreground">Todavía sin ejecutar.</p></TarjetaSeveridad>;
  if (r.configurado === false) return <TarjetaSeveridad titulo="YouTube" severidad="sindato"><p className="text-muted-foreground">{r.mensaje}</p></TarjetaSeveridad>;
  const videos = r.videos || [];
  const sinEtiquetas = videos.filter((v) => v.numTags === 0).length;
  const severidad: Severidad = sinEtiquetas > 0 ? "aviso" : "ok";
  return (
    <TarjetaSeveridad titulo="YouTube" severidad={severidad}>
      <p><span className="font-semibold tabular-nums">{r.canal?.suscriptores ?? 0}</span> suscriptores · <span className="font-semibold tabular-nums">{r.canal?.numVideos ?? 0}</span> vídeos</p>
      <p className="text-xs text-muted-foreground">{videos.length} analizados · {videos.filter((v) => v.esShort).length} Shorts</p>
      {sinEtiquetas > 0 && <p className="text-xs text-amber-700">{sinEtiquetas} vídeo(s) sin etiquetas</p>}
    </TarjetaSeveridad>
  );
}

export function TarjetaInstagram({ r }: { r?: ResumenInstagram }) {
  if (!r) return <TarjetaSeveridad titulo="Instagram" severidad="sindato"><p className="text-muted-foreground">Todavía sin ejecutar.</p></TarjetaSeveridad>;
  if (r.configurado === false) return <TarjetaSeveridad titulo="Instagram" severidad="sindato"><p className="text-muted-foreground">{r.mensaje}</p></TarjetaSeveridad>;
  const publicaciones = r.publicaciones || [];
  const sinHashtags = publicaciones.filter((p) => !p.tieneHashtags).length;
  const severidad: Severidad = sinHashtags > 0 ? "aviso" : "ok";
  return (
    <TarjetaSeveridad titulo="Instagram" severidad={severidad}>
      <p><span className="font-semibold tabular-nums">{r.seguidores ?? 0}</span> seguidores · <span className="font-semibold tabular-nums">{r.numPublicaciones ?? 0}</span> publicaciones</p>
      <p className="text-xs text-muted-foreground">{publicaciones.length} analizadas</p>
      {sinHashtags > 0 && <p className="text-xs text-amber-700">{sinHashtags} publicación(es) sin hashtags</p>}
    </TarjetaSeveridad>
  );
}

export function TarjetaTikTokSnapchat({ r }: { r?: ResumenTikTokSnapchat }) {
  if (!r) return <TarjetaSeveridad titulo="TikTok y Snapchat" severidad="sindato"><p className="text-muted-foreground">Todavía sin ejecutar.</p></TarjetaSeveridad>;
  return (
    <TarjetaSeveridad titulo="TikTok y Snapchat" severidad="sindato">
      <p className="text-muted-foreground">Sin datos reales de la cuenta todavía — las recomendaciones de abajo son buenas prácticas generales, no un análisis de tus vídeos.</p>
      {r.tiktok?.motivo && <p className="text-xs text-muted-foreground">TikTok: {r.tiktok.motivo}</p>}
      {r.snapchat?.motivo && <p className="text-xs text-muted-foreground">Snapchat: {r.snapchat.motivo}</p>}
    </TarjetaSeveridad>
  );
}

function ListaRecomendaciones({ titulo, items, esGenerico }: { titulo: string; items?: string[]; esGenerico?: boolean }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium">{titulo}{esGenerico && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(buenas prácticas generales)</span>}</h3>
      {items?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sin recomendaciones.</p>
      )}
    </div>
  );
}

export function TarjetaRecomendaciones({ r }: { r?: Recomendaciones }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Recomendaciones</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {!r ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">Todavía sin ejecutar.</p>
        ) : (
          <>
            <ListaRecomendaciones titulo="YouTube" items={r.youtube} />
            <ListaRecomendaciones titulo="Instagram" items={r.instagram} />
            <ListaRecomendaciones titulo="TikTok" items={r.tiktok} esGenerico />
            <ListaRecomendaciones titulo="Snapchat" items={r.snapchat} esGenerico />
          </>
        )}
      </CardContent>
    </Card>
  );
}
