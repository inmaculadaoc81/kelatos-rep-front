"use client";

import { AgentRun, AgentStep } from "@/lib/agentes";
import {
  Recomendaciones, ResumenInstagram, ResumenTikTokSnapchat, ResumenYoutube,
  SeccionInstagram, SeccionTikTokSnapchat, SeccionYoutube,
} from "../video-seo-componentes";

/** Canvas del run de SEO de vídeo: las mismas secciones del panel principal,
    pero fijadas a ESTE run concreto (no al último completado). */
export function CanvasVideoSeo({ steps }: { run: AgentRun; steps: AgentStep[]; tipoLabel: string }) {
  const pasoPor = (step: string) => steps.find((p) => p.step === step)?.output as unknown;
  const recomendaciones = pasoPor("recomendaciones") as Recomendaciones | undefined;

  return (
    <div className="min-w-0 flex-1 space-y-3 overflow-y-auto rounded-xl bg-white p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Resultado de este análisis</h2>
      <div className="space-y-4">
        <SeccionYoutube r={pasoPor("youtube_datos") as ResumenYoutube | undefined} recomendaciones={recomendaciones?.youtube} />
        <SeccionInstagram r={pasoPor("instagram_datos") as ResumenInstagram | undefined} recomendaciones={recomendaciones?.instagram} />
        <SeccionTikTokSnapchat
          r={pasoPor("tiktok_snapchat_notas") as ResumenTikTokSnapchat | undefined}
          recomendacionesTiktok={recomendaciones?.tiktok}
          recomendacionesSnapchat={recomendaciones?.snapchat}
        />
      </div>
    </div>
  );
}
