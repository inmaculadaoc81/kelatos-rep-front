"use client";

import { forwardRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Global } from "@/lib/icons";
import type { AgentRun } from "@/lib/agentes";

/** Piezas visuales compartidas entre CanvasAgente (campaign_pipeline) y
    CanvasLinkedIn (linkedin_intelligence) — mismo lenguaje de "editor de
    flujo" (tarjetas + conectores medidos de verdad), extraído para no
    duplicar el sistema de coordenadas/medición al añadir un segundo tipo
    de agente con su propio canvas. */

export const ERROR_CLASE = "border-destructive bg-destructive/5";

export function tokensCompacto(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function duracionRunMs(run: AgentRun): number {
  if (!run.startedAt) return 0;
  const fin = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  return Math.max(0, fin - new Date(run.startedAt).getTime());
}

export function formatearDuracion(ms: number): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

/** Favicon de un servicio (vía el servicio de favicons de Google). Si no
    carga, cae a un icono genérico — nunca deja un hueco roto. */
export function FaviconApp({ dominio, alt }: { dominio: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Global className="size-3.5" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${dominio}&sz=64`}
      alt={alt}
      width={24}
      height={24}
      className="size-6 shrink-0 rounded-md border border-border bg-white object-contain p-0.5"
      onError={() => setError(true)}
    />
  );
}

/** Icono pequeño dentro de una caja de 1px (mismo lenguaje visual que los
    pasos del panel "Actividad"). Va a la izquierda de cada fila. */
export function IconoCaja({ icon: Icono, tint }: { icon: LucideIcon; tint?: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-white">
      <Icono className={`size-3.5 ${tint ?? "text-muted-foreground"}`} strokeWidth={2} />
    </span>
  );
}

/** Punto de conexión: un <span> HTML redondeado (no un <circle> del SVG de
    conectores) a propósito — ese SVG usa preserveAspectRatio="none" para
    que sus coordenadas 0-100 calcen con el left/top % de las columnas, lo
    que estira cualquier <circle> hasta convertirlo en una elipse. Un
    <span> con tamaño fijo en px y border-radius siempre sale redondo,
    esté el contenedor a la anchura que esté. */
export function PuntoConector({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <span
      className="pointer-events-none absolute z-10 size-1.5 rounded-full"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", backgroundColor: color }}
    />
  );
}

// Curva suave entre dos puntos medidos de verdad — el punto de llegada de
// dos conectores al mismo lado de una tarjeta cae siempre en el centro
// vertical real de esa tarjeta, nunca dos puntos distintos.
export function curvaConector(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const midX = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C ${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}`;
}

/** Título con flecha arriba (sin caja propia) y el contenido en una caja
    aparte, ambas con border-radius 24. Sin posición propia: fluye dentro
    de su columna con `gap` uniforme. Con ref (hacia el <div> exterior,
    el borde real de la tarjeta) para que el canvas pueda medir su centro
    vertical y enganchar ahí los conectores. */
export const Tarjeta = forwardRef<
  HTMLDivElement,
  {
    titulo: React.ReactNode;
    children: React.ReactNode;
    /** Sobrescribe fondo/borde del contenedor exterior — la caja interior
        blanca no cambia. */
    claseExterior?: string;
  }
>(function Tarjeta({ titulo, children, claseExterior }, ref) {
  return (
    <div
      ref={ref}
      className={`shrink-0 rounded-[22px] border pt-3 pb-1 shadow-sm ${claseExterior || "border-border bg-[#F9FAFB]"}`}
    >
      <p className="mb-2 flex items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground">
        <ChevronDown className="size-3.5" /> {titulo}
      </p>
      <div className="mx-1 rounded-[16px] border bg-card p-3">{children}</div>
    </div>
  );
});
