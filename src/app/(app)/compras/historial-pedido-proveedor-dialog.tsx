"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, TickCircle, CloseCircle } from "@/lib/icons";
import type { RegistroPedidoProveedor } from "@/app/api/compras/pedido-proveedor/historial/route";

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Historial breve de lo registrado con "Pedido por pantallazo" — una
    tarjeta por cada vez que se pulsó "Registrar pedidos", con la lista de
    líneas aplicadas y a dónde fue cada una (stock o resguardo). Petición
    del usuario, 2026-10-12: poder ver rápido qué se ha dado de alta con
    esta función sin rastrearlo en la tabla de Compras. */
export function HistorialPedidoProveedorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [registros, setRegistros] = useState<RegistroPedidoProveedor[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCargando(true);
    fetch("/api/compras/pedido-proveedor/historial")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setRegistros(d.registros); })
      .finally(() => setCargando(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 p-0 sm:max-w-xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-1.5">
            <Clock className="size-5" /> Historial de &quot;Pedido por pantallazo&quot;
          </DialogTitle>
        </div>

        <div className="flex min-h-0 flex-1">
          <ScrollArea className="min-h-0 min-w-0 flex-1">
            <div className="space-y-2 p-4">
              {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}
              {!cargando && registros.length === 0 && (
                <p className="text-sm text-muted-foreground">Todavía no se ha registrado nada con esta función.</p>
              )}
              {registros.map((r) => (
                <div key={r.id} className="rounded-md border bg-card p-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                    <span>{fechaHora(r.fecha)}{r.usuario ? ` · ${r.usuario}` : ""}</span>
                    <span>{r.proveedorNombre}{r.numeroPedidoGlobal ? ` · Pedido ${r.numeroPedidoGlobal}` : ""}</span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {r.resumen.map((l, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        {l.ok ? (
                          <TickCircle className="size-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <CloseCircle className="size-3.5 shrink-0 text-destructive" />
                        )}
                        <span className="truncate">
                          {l.cantidad}× {l.nombre} — {l.destino === "tienda" ? `stock (${l.destinoDetalle})` : l.destinoDetalle}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
