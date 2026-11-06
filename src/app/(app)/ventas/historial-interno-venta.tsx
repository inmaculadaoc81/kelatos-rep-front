"use client";

import { useEffect, useState } from "react";
import type { EventoRegistro } from "@/lib/registro-acciones";

function fechaHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Historia INTERNA del pedido (no aparece en la factura ni en el ticket): quién hizo cada cosa y a qué hora —
 * crear la venta/factura, registrar pedidos, recibir, entregar, cancelar…— a partir del registro de acciones
 * (kelatos_app.historial, resguardo «V-<id>»). Petición del usuario, 2026-11-06.
 */
export function HistorialInternoVenta({ ventaId, version }: { ventaId: string; version?: unknown }) {
  const [eventos, setEventos] = useState<EventoRegistro[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/registro-acciones?busqueda=${encodeURIComponent(`V-${ventaId}`)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo || !d.ok) return;
        const propios = (d.eventos as EventoRegistro[]).filter((e) => e.resguardo === `V-${ventaId}`);
        propios.sort((a, b) => String(a.fechaHora).localeCompare(String(b.fechaHora)));
        setEventos(propios);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [ventaId, version]);

  if (!eventos || eventos.length === 0) return null;
  return (
    <details className="border-t bg-muted/20 px-4 py-2 text-xs" open>
      <summary className="cursor-pointer select-none text-sm font-semibold">Historial interno ({eventos.length})</summary>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
        {eventos.map((e) => (
          <li key={e.eventoId} className="flex flex-wrap gap-x-2">
            <span className="whitespace-nowrap font-medium tabular-nums">{fechaHora(e.fechaHora)}</span>
            <span className="whitespace-nowrap text-sky-700 dark:text-sky-400">{e.empleadoId || "—"}</span>
            <span className="text-muted-foreground">{e.descripcion}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
