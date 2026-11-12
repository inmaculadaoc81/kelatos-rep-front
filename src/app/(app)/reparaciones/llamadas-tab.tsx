"use client";

import { useEffect, useState } from "react";
import { ArrowDown2, Call, Clock } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { ETIQUETA_ESTADO, duracionTexto } from "@/lib/llamadas";
import { COLOR_ESTADO, DetalleLlamadaContenido } from "../llamadas/detalle-llamada";
import { Skeleton } from "@/components/ui/skeleton";

interface FilaLlamadaReparacion {
  id: number;
  inicio: string;
  usuario: string | null;
  telefono: string | null;
  estado: string;
  duracion_seg: number | null;
  tiene_grabacion: boolean;
  tiene_transcripcion: boolean;
}

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
}

/**
 * Pestaña «Llamadas» de la reparación: cuándo, quién y cuánto duró — lo ven todos.
 * Los superadmins pueden además desplegar cada llamada para ver el resumen, el audio y la transcripción.
 */
export function PanelLlamadas({ resguardo, esSuperadmin }: { resguardo: string; esSuperadmin: boolean }) {
  const [filas, setFilas] = useState<FilaLlamadaReparacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      fetch(`/api/reparaciones/${encodeURIComponent(resguardo)}/llamadas`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (!vivo) return; if (!d.ok) throw new Error(d.error || "No se pudo cargar"); setFilas(d.llamadas as FilaLlamadaReparacion[]); setError(null); })
        .catch((e) => { if (vivo) setError(e instanceof Error ? e.message : "Error desconocido"); });
    void cargar();
    const t = setInterval(() => { if (document.visibilityState === "visible") void cargar(); }, 10000);
    return () => { vivo = false; clearInterval(t); };
  }, [resguardo]);

  if (error && !filas) return <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>;
  if (!filas) return <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  if (filas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
        <Call className="size-6" />
        Todavía no se ha llamado al cliente desde esta reparación.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {filas.map((f) => {
        const desplegada = esSuperadmin && abierta === f.id;
        return (
          <li key={f.id} className="overflow-hidden rounded-xl border bg-card">
            <button
              type="button"
              disabled={!esSuperadmin}
              onClick={() => setAbierta(desplegada ? null : f.id)}
              className={cn("flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-left text-sm", esSuperadmin && "hover:bg-muted/40")}
            >
              <span className="font-medium capitalize">{fechaLarga(f.inicio)}</span>
              <span className="text-muted-foreground">{f.usuario || "—"}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="size-3.5" /> {duracionTexto(f.duracion_seg)}</span>
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", COLOR_ESTADO[f.estado] || "bg-muted text-muted-foreground")}>{ETIQUETA_ESTADO[f.estado] || f.estado}</span>
              {esSuperadmin && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                  {f.tiene_transcripcion ? "Ver transcripción" : f.tiene_grabacion ? "Ver detalle" : "Ver detalle"}
                  <ArrowDown2 className={cn("size-4 transition-transform", desplegada && "rotate-180")} />
                </span>
              )}
            </button>
            {desplegada && (
              <div className="space-y-4 border-t bg-muted/20 p-3">
                <DetalleLlamadaContenido id={String(f.id)} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
