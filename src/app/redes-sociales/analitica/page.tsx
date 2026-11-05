"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MARCAS, etiquetaDe, type Pieza } from "@/lib/contenido";
import { NOMBRE_RED, REDES_DE, estaSubida, fechaPieza, pendienteDeSubir } from "@/lib/redes-sociales";
import { AnaliticaRedes } from "../../agentes/redes/analitica-redes";
import { AnaliticaFacebook } from "../../agentes/redes/analitica-facebook";

const RED_ORDEN = ["instagram", "youtube", "facebook", "tiktok"] as const;
type Red = (typeof RED_ORDEN)[number];
const PERIODOS = [7, 30, 90] as const;

/** Qué hace falta para ver la analítica real de cada red que aún no está conectada. */
const COMO_CONECTAR: Record<Exclude<Red, "instagram">, string> = {
  youtube: "Conectar la cuenta del canal con permiso de lectura de YouTube Analytics (Google OAuth). Después se verían suscriptores, visualizaciones, tiempo de visionado y los vídeos que mejor funcionan.",
  facebook: "La página de Facebook usa la misma app de Meta que Instagram: hay que generar el token con los permisos de lectura de la página (pages_read_engagement y read_insights). Después se verían seguidores, alcance e interacciones.",
  tiktok: "Conectar la cuenta de TikTok (TikTok for Business / Display API) con permiso de lectura. Después se verían seguidores, visualizaciones e interacciones de cada vídeo.",
};

/** Actividad propia de una red: lo que sale de las piezas de Contenido (no necesita ninguna conexión con la red). */
function ActividadPropia({ red, piezas }: { red: Red; piezas: Pieza[] }) {
  const deRed = useMemo(() => piezas.filter((p) => p.redSocial && REDES_DE[p.redSocial].includes(red)), [piezas, red]);
  const subidos = deRed.filter(estaSubida);
  const pendientes = deRed.filter(pendienteDeSubir);
  const porMarca = useMemo(() => {
    const m = new Map<string, { subidos: number; pendientes: number }>();
    for (const p of deRed) {
      const k = etiquetaDe(MARCAS, p.marca);
      const fila = m.get(k) ?? { subidos: 0, pendientes: 0 };
      if (estaSubida(p)) fila.subidos++;
      else if (pendienteDeSubir(p)) fila.pendientes++;
      m.set(k, fila);
    }
    return [...m.entries()].sort((a, b) => b[1].subidos + b[1].pendientes - (a[1].subidos + a[1].pendientes));
  }, [deRed]);
  const recientes = [...subidos].sort((a, b) => String(b.programadaPara ?? b.creadoEn).localeCompare(String(a.programadaPara ?? a.creadoEn))).slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
        <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Piezas</p><p className="mt-1 text-2xl font-semibold tabular-nums">{deRed.length}</p></div>
        <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Subidos</p><p className="mt-1 text-2xl font-semibold tabular-nums">{subidos.length}</p></div>
        <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Pendientes</p><p className="mt-1 text-2xl font-semibold tabular-nums">{pendientes.length}</p></div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <p className="border-b px-3 py-2 text-sm font-semibold">Por marca</p>
          {porMarca.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin piezas para esta red.</p>
          ) : (
            <ul className="divide-y text-sm">
              {porMarca.map(([marca, n]) => (
                <li key={marca} className="flex items-center justify-between px-3 py-1.5">
                  <span>{marca}</span>
                  <span className="text-muted-foreground"><span className="font-medium text-foreground tabular-nums">{n.subidos}</span> subidos · <span className="tabular-nums">{n.pendientes}</span> pendientes</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border bg-card">
          <p className="border-b px-3 py-2 text-sm font-semibold">Últimos vídeos subidos</p>
          {recientes.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Todavía no hay vídeos subidos para esta red.</p>
          ) : (
            <ul className="divide-y text-sm">
              {recientes.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate">{p.titulo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fechaPieza(p)}</span>
                  <a href={p.enlaceVideo!} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary underline-offset-2 hover:underline">Abrir</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Analitica() {
  const router = useRouter();
  const params = useSearchParams();
  const redParam = params.get("red");
  const red: Red = RED_ORDEN.includes(redParam as Red) ? (redParam as Red) : "instagram";
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [piezas, setPiezas] = useState<Pieza[]>([]);

  useEffect(() => {
    fetch("/api/asistencia/kiosk/contenido")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPiezas(d.piezas as Pieza[]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Analítica</h1>
          <p className="text-sm text-muted-foreground">Cómo va cada red. Instagram y Facebook tienen analítica real; las demás muestran la actividad propia hasta que se conecten.</p>
        </div>
        {(red === "instagram" || red === "facebook") && (
          <div className="flex gap-1.5">
            {PERIODOS.map((p) => (
              <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", dias === p ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
                {p} días
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b pb-2">
        {RED_ORDEN.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={red === r}
            onClick={() => router.replace(`/redes-sociales/analitica?red=${r}`)}
            className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", red === r ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}
          >
            {NOMBRE_RED[r]}
            {r !== "instagram" && r !== "facebook" && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">sin conectar</span>}
          </button>
        ))}
      </div>

      {red === "instagram" ? (
        <AnaliticaRedes dias={dias} />
      ) : red === "facebook" ? (
        <AnaliticaFacebook dias={dias} />
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
            <p className="font-medium">La analítica de {NOMBRE_RED[red]} aún no está conectada</p>
            <p className="mt-1 text-muted-foreground">{COMO_CONECTAR[red]}</p>
          </div>
          <ActividadPropia red={red} piezas={piezas} />
        </div>
      )}
    </div>
  );
}

export default function RedesAnaliticaPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Analitica />
    </Suspense>
  );
}
