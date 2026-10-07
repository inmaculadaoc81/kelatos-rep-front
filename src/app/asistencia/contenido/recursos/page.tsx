"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Pieza } from "@/lib/contenido";
import { Warning2 } from "@/lib/icons";
import { MaterialDrive } from "../drive-material";
import { PiezaDialog } from "../pieza-dialog";

const POLL_MS = 30000;

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Solo "Recursos pendientes" — la lista completa de piezas que había aquí
    antes se quitó (petición del usuario, 2026-10-07: duplicaba el tablero
    Kanban de /asistencia/contenido sin aportar nada que esa vista no
    tuviera ya). Esta pantalla queda para lo único que de verdad no está
    en otro sitio: qué le pediste a cada compañero y todavía no te ha dado. */
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

  return (
    <div className="space-y-4">
      <MaterialDrive />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center justify-between border-b bg-amber-500/5 px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Warning2 className="size-4 text-amber-600 dark:text-amber-400" /> Recursos pendientes
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">{pendientes.length}</span>
        </div>
        <CardContent className="space-y-2 p-3">
          {pendientes.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground">No hay recursos pendientes.</p>}
          {pendientes.map(({ pieza, necesidad }) => (
            <button
              key={necesidad.id}
              type="button"
              onClick={() => setSeleccionada(pieza.id)}
              className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{necesidad.descripcion}</span>
                <span className="block truncate text-[11px] text-muted-foreground">Para «{pieza.titulo}»</span>
              </span>
              {necesidad.responsableNombre ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/10 text-primary">{iniciales(necesidad.responsableNombre)}</AvatarFallback>
                  </Avatar>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{necesidad.responsableNombre}</span>
                </span>
              ) : (
                <span className="shrink-0 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">Sin asignar</span>
              )}
            </button>
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
