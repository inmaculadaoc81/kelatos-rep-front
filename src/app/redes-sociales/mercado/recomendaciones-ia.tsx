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
  const [generando, setGenerando] = useState(false);
  const [r, setR] = useState<RecomendacionesIA | null>(null);
  const consulta = `dias=${dias}${organizacionId ? `&organizacion=${organizacionId}` : ""}`;

  // Al abrir la página: si ya hay una recomendación guardada se muestra; si se está generando (aunque hayas salido y vuelto), se espera a que termine.
  // La IA local tarda 1-2 minutos y trabaja en el servidor, así que no depende de que esta pantalla esté abierta.
  useEffect(() => {
    let vigente = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    async function consultar() {
      try {
        const data = (await (await fetch(`/api/mercado/recomendaciones?${consulta}`)).json()) as RecomendacionesIA & { generando?: boolean; vacio?: boolean };
        if (!vigente) return;
        if (data.ok && data.generando) { setGenerando(true); temporizador = setTimeout(consultar, 4000); return; }
        setGenerando(false);
        if (data.ok && !data.vacio) setR(data);
        else if (!data.ok && data.error) toast.error(data.error);
      } catch { if (vigente) setGenerando(false); }
    }
    consultar();
    return () => { vigente = false; if (temporizador) clearTimeout(temporizador); };
  }, [consulta]);

  async function pedir(refrescar: boolean) {
    setGenerando(true);
    try {
      const res = await fetch("/api/mercado/recomendaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizacion: organizacionId, dias, refrescar }) });
      const data = (await res.json()) as RecomendacionesIA & { generando?: boolean };
      if (!data.ok) throw new Error(data.error || "No se pudo generar");
      if (data.generando) {
        // Se genera en segundo plano: se consulta cada pocos segundos hasta que esté (o falle).
        for (let i = 0; i < 120; i++) {
          await new Promise((ok) => setTimeout(ok, 4000));
          const e = (await (await fetch(`/api/mercado/recomendaciones?${consulta}`)).json()) as RecomendacionesIA & { generando?: boolean; vacio?: boolean };
          if (e.ok && e.generando) continue;
          if (!e.ok) throw new Error(e.error || "No se pudo generar");
          if (!e.vacio) setR(e);
          break;
        }
      } else {
        setR(data);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold"><Magicpen className="size-4 text-emerald-600" /> Recomendaciones con IA</p>
          <p className="text-[11px] text-muted-foreground">La IA lee los datos de esta página y propone qué hacer. No inventa datos: solo usa los números que ves aquí.</p>
        </div>
        <Button size="sm" disabled={generando} onClick={() => pedir(!!r)}>{generando ? "Generando…" : r ? "Volver a generar" : "Generar recomendaciones"}</Button>
      </div>
      {!r && !generando && <p className="px-3 py-5 text-center text-sm text-muted-foreground">Pulsa «Generar recomendaciones» para obtener un plan de acciones priorizado.</p>}
      {generando && <p className="px-3 py-5 text-center text-sm text-muted-foreground">La IA está analizando los datos… tarda entre 1 y 2 minutos. Puedes salir de esta página: seguirá generándose y la verás al volver.</p>}
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
