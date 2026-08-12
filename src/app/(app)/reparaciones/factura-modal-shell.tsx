"use client";

import { Receipt, CloseCircle, Hashtag, Calendar, Money } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { FacturaAccionesTabs, derivarDatosFactura, TIPO_BADGE, euros, type TipoFacturaBase } from "./factura-acciones-tabs";

/**
 * Reproduce la cabecera de #modalFcAcciones (Index.html) — icono + número +
 * insignia de tipo, subtítulo con el cliente, y la "barra de datos" con
 * Ref./Fecha/Total (siempre con IVA, igual que _mfaRenderResumen). Se usa
 * en todos los modales de factura (Facturas de Clientes y detalle de
 * reparación) para que sean visualmente idénticos al original.
 */
export function FacturaModalShell({
  detalle,
  tipoBase,
  open,
  onOpenChange,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  tipoBase: TipoFacturaBase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const d = derivarDatosFactura(detalle, tipoBase);
  const badge = TIPO_BADGE[tipoBase];
  const fecha = detalle.fechaRecepcion ? new Date(detalle.fechaRecepcion).toLocaleDateString("es-ES") : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <header className="rounded-t-xl bg-primary px-4 pt-3 pb-2 text-primary-foreground">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Receipt className="size-4.5 shrink-0" />
                <DialogTitle className="text-sm font-bold text-primary-foreground">{d.numeroFactura || "Factura"}</DialogTitle>
                {badge && <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", badge.className)}>{badge.label}</span>}
              </div>
              <p className="truncate text-xs text-primary-foreground/70">{d.clienteNombre || "Sin nombre"}</p>
            </div>
            <Button variant="ghost" size="icon-sm" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={() => onOpenChange(false)}>
              <CloseCircle className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b bg-primary/5 px-4 py-2">
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            <Hashtag className="size-3" /> Ref. {detalle.resguardo}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" /> {fecha}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Money className="size-3" /> {d.numeroFactura ? euros(d.totalConIva) : "—"}
          </span>
        </div>

        <div className="p-4">
          <FacturaAccionesTabs detalle={detalle} tipoBase={tipoBase} onActualizado={onActualizado} />
        </div>

        <footer className="flex justify-end border-t bg-muted/50 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
