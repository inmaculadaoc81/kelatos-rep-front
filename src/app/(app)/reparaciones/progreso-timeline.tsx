"use client";

import { TickCircle, Timer1, Box, Setting2, Truck, DocumentText, Hierarchy, Sms } from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { formatearFecha } from "@/lib/dias-entrega";
import { calcularFases, type EstadoFase } from "@/lib/progreso-reparacion";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";

/**
 * Icono propio de cada fase, usado mientras aún no está completada.
 * Ninguno puede parecerse a un check: solo la fase completada lo lleva.
 */
const ICONO_FASE: Record<string, Icon> = {
  recepcion: TickCircle,
  presupuesto: DocumentText,
  respuesta: Sms,
  pieza: Box,
  reparacion: Setting2,
  entrega: Truck,
};

// Los tres estados se distinguen por color Y por icono (check / reloj /
// icono propio de la fase), para que el progreso no dependa solo del color.
const ESTILO_NODO: Record<EstadoFase, string> = {
  completada: "bg-emerald-600 text-white ring-emerald-600/20",
  "en-curso": "bg-amber-500 text-white ring-amber-500/25",
  pendiente: "bg-muted text-muted-foreground ring-transparent",
  "no-aplica": "bg-muted/50 text-muted-foreground/60 ring-transparent",
};

export function ProgresoTimeline({ detalle }: { detalle: ReparacionDetalle }) {
  const fases = calcularFases(detalle, formatearFecha);

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <Hierarchy className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Progreso de la Reparación</h3>
      </header>

      <div className="flex items-start overflow-x-auto px-3 py-4">
        {fases.map((f, i) => {
          const IconoPropio = ICONO_FASE[f.clave];
          const Icono =
            f.estado === "completada" ? TickCircle : f.estado === "en-curso" ? Timer1 : IconoPropio;
          return (
            <div key={f.clave} className="contents">
              {i > 0 && (
                // El conector se alinea con el centro del nodo (size-11 → mt-5.5).
                <div className="mt-5.5 h-0.5 min-w-4 flex-1 shrink bg-border" aria-hidden />
              )}
              <div className="flex min-w-20 flex-1 flex-col items-center gap-1.5 text-center">
                <span
                  className={`inline-flex size-11 items-center justify-center rounded-full ring-4 ${ESTILO_NODO[f.estado]}`}
                >
                  {/* Solo la fase cerrada va en Bold: el relleno macizo del
                      reloj de arena tapaba su forma sobre el ámbar. */}
                  <Icono className="size-5" variant={f.estado === "completada" ? "Bold" : "Linear"} />
                </span>
                <span className="text-xs font-semibold">{f.etiqueta}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{f.detalle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
