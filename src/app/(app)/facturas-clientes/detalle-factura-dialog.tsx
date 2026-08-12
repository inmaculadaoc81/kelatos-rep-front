"use client";

import { useEffect, useState } from "react";
import { Receipt, CloseCircle, DocumentText, TickCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/confirm-provider";
import { toast } from "sonner";
import { formatearFecha } from "@/lib/dias-entrega";
import {
  FacturaCliente,
  ETIQUETA_TIPO_FACTURA,
  serieFactura,
  montoConIva,
  estadoFacturaDerivado,
  tipoPermiteMarcarCobrada,
  formaPagoLabel,
} from "@/lib/facturas-cliente";
import type { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { FacturaAccionesTabs } from "../reparaciones/factura-acciones-tabs";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 px-4 py-2">
      <dt className="text-sm font-medium text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 text-sm wrap-break-word">{valor}</dd>
    </div>
  );
}

/**
 * Reproduce abrirModalFcAcciones() del original — para tipo 'reparacion'/
 * 'revision' muestra las 3 pestañas completas (PDF/Enviar, Devolución,
 * Rectificativo), igual que el modal #modalFcAcciones. Para el resto de
 * tipos (mensajería, anticipo, alquiler, recogida, manual, venta) se
 * mantiene la vista reducida de solo lectura — fuera de alcance por ahora.
 */
export function DetalleFacturaDialog({
  factura,
  onOpenChange,
  onCobrada,
}: {
  factura: FacturaCliente | null;
  onOpenChange: (open: boolean) => void;
  onCobrada: () => void;
}) {
  if (!factura) return null;

  const tieneTabs = factura.tipo === "reparacion" || factura.tipo === "revision";
  if (tieneTabs) {
    return (
      <DetalleFacturaConTabs
        key={factura.resguardo + factura.tipo}
        factura={factura}
        onOpenChange={onOpenChange}
        onActualizado={onCobrada}
      />
    );
  }
  return <DetalleFacturaSimple factura={factura} onOpenChange={onOpenChange} onCobrada={onCobrada} />;
}

function DetalleFacturaConTabs({
  factura,
  onOpenChange,
  onActualizado,
}: {
  factura: FacturaCliente;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const [detalle, setDetalle] = useState<ReparacionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/reparaciones/${encodeURIComponent(factura.resguardo)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDetalle(data.detalle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factura.resguardo]);

  function actualizar() {
    cargar();
    onActualizado();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
          <Receipt className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-primary-foreground">
            {factura.numero} — {factura.cliente || "Sin nombre"}
          </DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={() => onOpenChange(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        {cargando && (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {!cargando && error && (
          <p className="p-4 text-sm text-destructive">Error al cargar: {error}</p>
        )}

        {!cargando && !error && detalle && (
          <div className="p-4">
            <FacturaAccionesTabs detalle={detalle} tipoBase={factura.tipo === "revision" ? "revision" : "normal"} onActualizado={actualizar} />
          </div>
        )}

        <footer className="flex justify-end border-t bg-muted/50 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function DetalleFacturaSimple({
  factura,
  onOpenChange,
  onCobrada,
}: {
  factura: FacturaCliente;
  onOpenChange: (open: boolean) => void;
  onCobrada: () => void;
}) {
  const confirmar = useConfirm();
  const [marcando, setMarcando] = useState(false);

  const estado = estadoFacturaDerivado(factura);
  const puedeMarcar = tipoPermiteMarcarCobrada(factura.tipo) && estado === "Pendiente";

  async function marcarCobrada() {
    const ok = await confirmar(`¿Confirma que la factura ${factura.numero} ha sido cobrada?`);
    if (!ok) return;
    setMarcando(true);
    try {
      const res = await fetch("/api/facturas-clientes/marcar-cobrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resguardo: factura.resguardo, tipo: factura.tipo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Factura marcada como Cobrada");
      onCobrada();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setMarcando(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
          <Receipt className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-primary-foreground">Factura {factura.numero}</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={() => onOpenChange(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <dl className="divide-y">
          <Fila etiqueta="Serie" valor={serieFactura(factura.numero) === "3" ? "Serie 3 — Rectificativas" : "Serie 1 — Cobros"} />
          <Fila etiqueta="Tipo" valor={ETIQUETA_TIPO_FACTURA[factura.tipo]} />
          <Fila etiqueta="Cliente" valor={factura.cliente || "-"} />
          {factura.dniCif && <Fila etiqueta="DNI/CIF" valor={factura.dniCif} />}
          {factura.equipo && <Fila etiqueta="Equipo" valor={factura.equipo} />}
          <Fila etiqueta="Fecha" valor={formatearFecha(factura.fecha)} />
          <Fila etiqueta="Total" valor={<span className={`font-semibold ${montoConIva(factura) < 0 ? "text-destructive" : ""}`}>{euros(montoConIva(factura))}</span>} />
          <Fila etiqueta="Forma de pago" valor={formaPagoLabel(factura)} />
          <Fila etiqueta="Estado" valor={estado} />
        </dl>

        <footer className="flex flex-wrap justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          {factura.url && (
            <Button
              variant="outline"
              className="gap-1.5"
              nativeButton={false}
              render={<a href={factura.url} target="_blank" rel="noopener noreferrer" />}
            >
              <DocumentText className="size-3.5" /> Ver PDF
            </Button>
          )}
          {puedeMarcar && (
            <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" disabled={marcando} onClick={marcarCobrada}>
              <TickCircle className="size-3.5" /> {marcando ? "Marcando…" : "Marcar como Cobrada"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
