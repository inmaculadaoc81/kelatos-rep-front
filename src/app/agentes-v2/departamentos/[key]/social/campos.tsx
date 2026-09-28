"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { COLOR_TIPO, ESTADO_TEXTO, NOMBRE_TIPO, type EstadoCarrusel } from "./use-social";

export function Campo({ etiqueta, ayuda, children, className }: { etiqueta: string; ayuda?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs font-medium">{etiqueta}</label>
      {children}
      {ayuda && <p className="text-[11px] text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

/** Contador «12/60»: se pone rojo al pasarse del límite, porque el servidor rechaza el texto que lo supere. */
function Contador({ n, max }: { n: number; max: number }) {
  return <span className={cn("text-[10px] tabular-nums", n > max ? "font-medium text-red-600" : "text-muted-foreground")}>{n}/{max}</span>;
}

export function TextoLimitado({ etiqueta, valor, onChange, max, filas, ayuda }: { etiqueta: string; valor: string; onChange: (v: string) => void; max: number; filas?: number; ayuda?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium">{etiqueta}</label>
        <Contador n={valor.length} max={max} />
      </div>
      {filas ? <Textarea rows={filas} value={valor} onChange={(e) => onChange(e.target.value)} className="min-h-0 text-sm" /> : <Input value={valor} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />}
      {ayuda && <p className="text-[11px] text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

export function Selector<T extends string>({ valor, onChange, opciones, deshabilitado }: { valor: T; onChange: (v: T) => void; opciones: { valor: T; texto: string; off?: boolean }[]; deshabilitado?: boolean }) {
  return (
    <select
      value={valor}
      disabled={deshabilitado}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
    >
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor} disabled={o.off}>{o.texto}</option>
      ))}
    </select>
  );
}

export function EstadoBadge({ estado }: { estado: EstadoCarrusel }) {
  const e = ESTADO_TEXTO[estado] ?? ESTADO_TEXTO.draft;
  return <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", e.clase)}>{e.texto}</span>;
}

export function Progreso({ valor }: { valor: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(3, Math.min(100, valor))}%` }} />
    </div>
  );
}

export const fechaCorta = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export function TipoBadge({ id }: { id: string | null }) {
  if (!id) return null;
  return <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", COLOR_TIPO[id] ?? "bg-muted text-muted-foreground")}>{NOMBRE_TIPO[id] ?? id}</span>;
}
