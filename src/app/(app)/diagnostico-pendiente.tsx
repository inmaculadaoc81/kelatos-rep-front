"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Clock, Hashtag, InfoCircle, Profile, TickCircle, Warning2 } from "@/lib/icons";
import { useSondeoVisible } from "@/hooks/use-sondeo-visible";
import { MARGEN_AVISO_MS, type DiagnosticoPendiente } from "@/lib/diagnostico-pendiente";

const irAReparacion = (resguardo: string) => {
  window.location.href = `/reparaciones?resguardo=${encodeURIComponent(resguardo)}`;
};

/** Consulta cada minuto los diagnósticos sin cobrar y avisa cuando aparece uno nuevo. */
export function useDiagnosticosPendientes() {
  const [pendientes, setPendientes] = useState<DiagnosticoPendiente[]>([]);
  const [dias, setDias] = useState(30);
  const [error, setError] = useState(false);
  // null = todavía sin primera carga: lo que ya estaba pendiente al abrir la página no lanza aviso emergente.
  const vistosRef = useRef<Set<string> | null>(null);

  async function cargar() {
    try {
      const res = await fetch("/api/diagnostico-pendiente");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      const lista = data.pendientes as DiagnosticoPendiente[];
      setPendientes(lista);
      setDias(data.dias as number);
      setError(false);

      const maduros = lista.filter((p) => Date.now() - new Date(p.fechaRecepcion).getTime() >= MARGEN_AVISO_MS);
      if (vistosRef.current === null) {
        vistosRef.current = new Set(maduros.map((p) => p.resguardo));
        return;
      }
      const nuevos = maduros.filter((p) => !vistosRef.current!.has(p.resguardo));
      for (const p of nuevos) vistosRef.current.add(p.resguardo);
      if (nuevos.length > 0) {
        const p = nuevos[0];
        toast.warning(`Falta cobrar el diagnóstico del resguardo ${p.resguardo}`, {
          description: `${p.cliente} — ${p.equipo}${nuevos.length > 1 ? ` (y ${nuevos.length - 1} más)` : ""}`,
          duration: 20_000,
          action: { label: "Abrir", onClick: () => irAReparacion(p.resguardo) },
        });
      }
    } catch {
      setError(true);
    }
  }

  useSondeoVisible(cargar, 60_000, true);

  return { pendientes, dias, error, recargar: cargar };
}

export function ListaDiagnosticosPendientes({ pendientes, dias, error }: { pendientes: DiagnosticoPendiente[]; dias: number; error: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
      <p className="mb-3 flex items-start gap-1.5 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
        <InfoCircle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Equipos recibidos en los últimos {dias} días sin ticket ni factura de revisión. No incluye portátiles, Dyson, Thermomix, consolas,
          conversiones de cintas ni garantías. Cada aviso desaparece al generar el ticket o la factura de revisión.
        </span>
      </p>

      {error && <p className="mb-3 text-center text-xs text-destructive">No se pudo actualizar la lista. Se volverá a intentar.</p>}

      {pendientes.length === 0 ? (
        !error && (
          <p className="flex items-center justify-center gap-1.5 py-10 text-sm text-muted-foreground">
            <TickCircle className="size-4 text-emerald-600" /> No hay diagnósticos sin cobrar.
          </p>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pendientes.map((p) => (
            <button
              key={p.resguardo}
              type="button"
              onClick={() => irAReparacion(p.resguardo)}
              className="w-full min-w-0 space-y-1.5 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Warning2 className="size-4 shrink-0 text-amber-600" />
                  <Hashtag className="size-3.5 shrink-0" />
                  {p.resguardo}
                </span>
                {p.entregado && <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">Ya salió</span>}
              </span>
              <span className="block truncate text-xs font-medium">{p.equipo}</span>
              <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <Profile className="size-3.5 shrink-0" />
                <span className="min-w-0 truncate">{[p.cliente, p.telefono].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {p.estado}
                {p.documentoReparacion ? ` · Reparación cobrada (${p.documentoReparacion})` : ""}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3 shrink-0" />
                Recibido{" "}
                {new Date(p.fechaRecepcion).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
