"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ESTADOS, etiquetaDe, TIPOS, type Pieza, type TipoPieza } from "@/lib/contenido";
import { PiezaDialog } from "../pieza-dialog";

const POLL_MS = 30000;

/** Qué recursos faltan para cada pieza, quién los tiene y qué enlaces ya hay. */
export default function RecursosPage() {
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/asistencia/kiosk/contenido");
        const data = await res.json();
        if (activo && data.ok) setPiezas(data.piezas as Pieza[]);
      } catch {
        // silencioso — se reintenta en el siguiente poll
      } finally {
        if (activo) setCargando(false);
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      activo = false;
      clearInterval(t);
    };
  }, []);

  if (cargando) return <Skeleton className="h-64 w-full" />;

  const pendientes = piezas.flatMap((p) =>
    p.necesidades.filter((n) => !n.recibido).map((n) => ({ pieza: p, necesidad: n })),
  );
  const ordenadas = [...piezas].sort((a, b) => {
    const fa = a.programadaPara ?? a.fechaLimite ?? "9999";
    const fb = b.programadaPara ?? b.fechaLimite ?? "9999";
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Recursos pendientes</span>
            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">{pendientes.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {pendientes.length === 0 && <p className="text-xs text-muted-foreground">No hay recursos pendientes.</p>}
          {pendientes.map(({ pieza, necesidad }) => (
            <button
              key={necesidad.id}
              type="button"
              onClick={() => setSeleccionada(pieza.id)}
              className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{necesidad.descripcion}</span>
                <span className="block truncate text-[11px] text-muted-foreground">Para «{pieza.titulo}»</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{necesidad.responsableNombre ?? "Sin asignar"}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Piezas</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {ordenadas.length === 0 && <p className="text-xs text-muted-foreground">Todavía no hay piezas.</p>}
          {ordenadas.map((p) => {
            const estado = ESTADOS.find((e) => e.valor === p.estado);
            const recibidos = p.necesidades.filter((n) => n.recibido).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSeleccionada(p.id)}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{p.titulo}</span>
                <span className="text-[11px] text-muted-foreground">{etiquetaDe(TIPOS, p.tipo as TipoPieza | null)}</span>
                <span className="text-[11px] text-muted-foreground">
                  Recursos {recibidos}/{p.necesidades.length}
                </span>
                <span className="text-[11px] text-muted-foreground">Enlaces {p.recursos.length}</span>
                {estado && <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", estado.color)}>{estado.etiqueta}</span>}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <PiezaDialog
        piezaId={seleccionada}
        open={seleccionada !== null}
        onOpenChange={(o) => !o && setSeleccionada(null)}
        onCambiada={() => {
          fetch("/api/asistencia/kiosk/contenido").then((r) => r.json()).then((d) => d.ok && setPiezas(d.piezas as Pieza[]));
        }}
      />
    </div>
  );
}
