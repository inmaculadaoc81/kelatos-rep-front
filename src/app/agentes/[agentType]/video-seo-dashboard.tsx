"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentRun, AgentStep } from "@/lib/agentes";
import { Refresh2 } from "@/lib/icons";
import {
  Recomendaciones, ResumenInstagram, ResumenTikTokSnapchat, ResumenYoutube,
  TablaPublicacionesInstagram, TablaVideosYoutube,
  TarjetaInstagram, TarjetaRecomendaciones, TarjetaTikTokSnapchat, TarjetaYoutube,
} from "./video-seo-componentes";

/** Panel del agente de SEO de vídeo: 3 tarjetas de datos + recomendaciones del
    último run completado + botón para lanzar uno nuevo a mano. Mismo patrón
    que SeguridadDashboard — lee los pasos vía GET /api/agentes/runs/:id. */
export function VideoSeoDashboard({ runs, cargando, onEjecutado }: { runs: AgentRun[]; cargando: boolean; onEjecutado: () => void }) {
  const [pasos, setPasos] = useState<AgentStep[] | null>(null);
  const [cargandoPasos, setCargandoPasos] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);

  const ultimoCompletado = runs.find((r) => r.status === "completed") ?? null;

  useEffect(() => {
    if (!ultimoCompletado) {
      setPasos(null);
      setCargandoPasos(false);
      return;
    }
    setCargandoPasos(true);
    fetch(`/api/agentes/runs/${ultimoCompletado.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setPasos(data.steps as AgentStep[]); })
      .catch(() => {})
      .finally(() => setCargandoPasos(false));
  }, [ultimoCompletado?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pasoPor = (step: string) => pasos?.find((p) => p.step === step && p.status === "completed")?.output as unknown;
  const youtube = pasoPor("youtube_datos") as ResumenYoutube | undefined;
  const instagram = pasoPor("instagram_datos") as ResumenInstagram | undefined;

  async function ejecutarAhora() {
    setEjecutando(true);
    try {
      const res = await fetch("/api/agentes/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: "video_seo", goal: "Análisis manual de SEO de vídeo", input: {} }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Análisis lanzado — puede tardar un minuto");
      setTimeout(onEjecutado, 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEjecutando(false);
    }
  }

  const corriendoAhora = runs.some((r) => r.status === "queued" || r.status === "running");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            {ultimoCompletado ? `Último análisis: ${new Date(ultimoCompletado.finishedAt || ultimoCompletado.createdAt).toLocaleString("es-ES")}` : "Todavía no se ha ejecutado ningún análisis"}
          </h2>
        </div>
        <Button size="sm" disabled={ejecutando || corriendoAhora} onClick={ejecutarAhora} className="gap-1.5">
          <Refresh2 className={corriendoAhora ? "size-4 animate-spin" : "size-4"} />
          {corriendoAhora ? "Ejecutando…" : "Ejecutar análisis ahora"}
        </Button>
      </div>

      {cargando || cargandoPasos ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <TarjetaYoutube r={youtube} />
            <TarjetaInstagram r={instagram} />
            <TarjetaTikTokSnapchat r={pasoPor("tiktok_snapchat_notas") as ResumenTikTokSnapchat | undefined} />
          </div>
          <TablaVideosYoutube r={youtube} />
          <TablaPublicacionesInstagram r={instagram} />
          <TarjetaRecomendaciones r={pasoPor("recomendaciones") as Recomendaciones | undefined} />
        </div>
      )}
      {ultimoCompletado && (
        <p className="text-xs text-muted-foreground">
          <Link href={`/agentes/video_seo/${ultimoCompletado.id}`} className="text-primary underline-offset-2 hover:underline">Ver el detalle paso a paso →</Link>
        </p>
      )}
    </div>
  );
}
