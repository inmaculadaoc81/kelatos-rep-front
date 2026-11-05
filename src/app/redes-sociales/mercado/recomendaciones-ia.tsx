"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Magicpen } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecomendacionesIA } from "@/lib/mercado";

const COLOR_PRIORIDAD = { alta: "bg-red-500/15 text-red-700 dark:text-red-300", media: "bg-amber-500/15 text-amber-700 dark:text-amber-300", baja: "bg-muted text-muted-foreground" } as const;
const TIPO: Record<string, string> = { contenido: "Contenido", seo: "SEO", redes: "Redes sociales", web: "Web", competencia: "Competencia" };

/** Recomendaciones con IA a partir de los datos del estudio. Solo se piden con el botón (cada una tiene un pequeño coste). */
export function RecomendacionesIAPanel({ organizacionId, dias }: { organizacionId: string | null; dias: number }) {
  const [cargando, setCargando] = useState(false);
  const [r, setR] = useState<RecomendacionesIA | null>(null);

  // Al abrir la página se muestra la última recomendación guardada (si la hay), sin llamar a la IA ni gastar nada.
  useEffect(() => {
    let vigente = true;
    fetch(`/api/mercado/recomendaciones?dias=${dias}${organizacionId ? `&organizacion=${organizacionId}` : ""}`)
      .then((res) => res.json())
      .then((data) => { if (vigente && data.ok && !data.vacio) setR(data as RecomendacionesIA); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [organizacionId, dias]);

  async function pedir(refrescar: boolean) {
    setCargando(true);
    try {
      const res = await fetch("/api/mercado/recomendaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizacion: organizacionId, dias, refrescar }) });
      const data = (await res.json()) as RecomendacionesIA;
      if (!data.ok) throw new Error(data.error || "No se pudo generar");
      setR(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold"><Magicpen className="size-4 text-emerald-600" /> Recomendaciones con IA</p>
          <p className="text-[11px] text-muted-foreground">La IA lee los datos de esta página y propone qué hacer. No inventa datos: solo usa los números que ves aquí.</p>
        </div>
        <Button size="sm" disabled={cargando} onClick={() => pedir(!!r)}>{cargando ? "Analizando…" : r ? "Volver a generar" : "Generar recomendaciones"}</Button>
      </div>
      {!r && !cargando && <p className="px-3 py-5 text-center text-sm text-muted-foreground">Pulsa «Generar recomendaciones» para obtener un plan de acciones priorizado.</p>}
      {cargando && !r && <p className="px-3 py-5 text-center text-sm text-muted-foreground">Analizando los datos… tarda unos 20 segundos.</p>}
      {r && (
        <div className="space-y-3 p-3">
          <p className="text-sm">{r.resumen}</p>
          <ul className="space-y-2">
            {r.recomendaciones.map((x, i) => (
              <li key={i} className="rounded-md border p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{x.titulo}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", COLOR_PRIORIDAD[x.prioridad])}>Prioridad {x.prioridad}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{TIPO[x.tipo] ?? x.tipo}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground"><b className="text-foreground">Por qué:</b> {x.por_que}</p>
                <p className="mt-0.5 text-xs text-muted-foreground"><b className="text-foreground">Qué hacer:</b> {x.accion}</p>
              </li>
            ))}
          </ul>
          {r.ideas_redes.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold">Ideas para redes sociales</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {r.ideas_redes.map((x, i) => <li key={i}><b className="capitalize text-foreground">{x.red}:</b> {x.idea}</li>)}
              </ul>
            </div>
          )}
          {r.riesgos.length > 0 && <div><p className="mb-1 text-xs font-semibold">Ojo con</p><ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{r.riesgos.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {r.limites.length > 0 && <div><p className="mb-1 text-xs font-semibold">Lo que estos datos no permiten saber</p><ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{r.limites.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          <p className="text-[11px] text-muted-foreground">{r.desdeCache ? "Guardada de una consulta anterior. " : ""}Generada {r.generadoEn ? new Date(r.generadoEn).toLocaleString("es-ES") : ""}. Son sugerencias: revísalas antes de aplicarlas.</p>
        </div>
      )}
    </div>
  );
}
