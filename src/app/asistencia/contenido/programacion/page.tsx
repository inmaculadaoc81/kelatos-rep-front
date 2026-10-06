"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ESTADOS, REDES, etiquetaDe, type Pieza, type RedSocial } from "@/lib/contenido";
import { PiezaDialog } from "../pieza-dialog";

const POLL_MS = 30000;

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fechaDia(dia: string) {
  return new Date(`${dia}T00:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" });
}

/** Piezas ordenadas por cuándo salen: primero las programadas (fecha y hora),
    después las que solo tienen fecha límite. */
export default function ProgramacionPage() {
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
        else if (activo && !data.ok) toast.error(data.error || "Error desconocido");
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

  const programadas = piezas
    .filter((p) => p.programadaPara)
    .sort((a, b) => new Date(a.programadaPara!).getTime() - new Date(b.programadaPara!).getTime());
  const sinProgramar = piezas
    .filter((p) => !p.programadaPara && p.fechaLimite)
    .sort((a, b) => (a.fechaLimite! < b.fechaLimite! ? -1 : 1));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Programadas</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {programadas.length === 0 && <p className="text-xs text-muted-foreground">No hay piezas programadas.</p>}
          {programadas.map((p) => (
            <Fila key={p.id} pieza={p} onAbrir={() => setSeleccionada(p.id)} cuando={fechaCorta(p.programadaPara!)} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Solo con fecha límite</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {sinProgramar.length === 0 && <p className="text-xs text-muted-foreground">Ninguna.</p>}
          {sinProgramar.map((p) => (
            <Fila key={p.id} pieza={p} onAbrir={() => setSeleccionada(p.id)} cuando={`Límite ${fechaDia(p.fechaLimite!)}`} />
          ))}
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

function Fila({ pieza, onAbrir, cuando }: { pieza: Pieza; onAbrir: () => void; cuando: string }) {
  const estado = ESTADOS.find((e) => e.valor === pieza.estado);
  return (
    <button type="button" onClick={onAbrir} className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40">
      <span className="w-40 shrink-0 text-xs tabular-nums text-muted-foreground">{cuando}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{pieza.titulo}</span>
      <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{etiquetaDe(REDES, pieza.redSocial as RedSocial | null)}</span>
      {estado && <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium", estado.color)}>{estado.etiqueta}</span>}
    </button>
  );
}
