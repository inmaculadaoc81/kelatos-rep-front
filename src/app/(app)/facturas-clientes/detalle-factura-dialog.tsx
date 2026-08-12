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
import { FacturaModalShell } from "../reparaciones/factura-modal-shell";
import type { TipoFacturaBase } from "../reparaciones/factura-acciones-tabs";

/**
 * Resuelve a qué tipoBase corresponde una fila de la lista — para
 * rectificativa/corregida hace falta tipoOriginal (reparación o revisión)
 * porque ambas colapsan al mismo "tipo" visible en la lista, pero son
 * documentos distintos (numero_factura_rectificativa vs. ..._revision).
 * Alquiler/recogida/manual/venta no tienen un resguardo de reparación real
 * (ALQ-xxx/MANUAL-xxx) — se quedan en la vista simple, fuera de alcance.
 */
function resolverTipoBase(factura: FacturaCliente): TipoFacturaBase | null {
  // Alquiler también usa tipo:'rectificativa'/'alquiler' con su propio
  // resguardo (ALQ-xxx, no un resguardo de reparación real) — nunca tiene
  // el detalle completo que necesitan las pestañas.
  if (factura.esAlquiler || factura.esManual) return null;
  switch (factura.tipo) {
    case "reparacion": return "normal";
    case "revision": return "revision";
    case "mensajeria": return "mensajeria";
    case "anticipo": return "anticipo";
    case "rectificativa": return factura.tipoOriginal === "revision" ? "rectificativa_revision" : "rectificativa";
    case "corregida": return factura.tipoOriginal === "revision" ? "corregida_revision" : "corregida";
    default: return null;
  }
}

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
 * Reproduce abrirModalFcAcciones() del original. reparación/revisión/
 * mensajería tienen las 3 pestañas completas; anticipo/rectificativa/
 * corregida solo PDF/Enviar (igual que _esRect en _mfaRenderResumen: un
 * documento que ya es una rectificativa o corregida no encadena su propia
 * devolución). Alquiler/recogida/manual/venta se quedan en la vista
 * reducida de solo lectura — fuera de alcance por ahora.
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

  const tipoBase = resolverTipoBase(factura);
  if (tipoBase) {
    return (
      <DetalleFacturaConTabs
        key={factura.resguardo + factura.tipo}
        factura={factura}
        tipoBase={tipoBase}
        onOpenChange={onOpenChange}
        onActualizado={onCobrada}
      />
    );
  }
  return <DetalleFacturaSimple factura={factura} onOpenChange={onOpenChange} onCobrada={onCobrada} />;
}

function DetalleFacturaConTabs({
  factura,
  tipoBase,
  onOpenChange,
  onActualizado,
}: {
  factura: FacturaCliente;
  tipoBase: TipoFacturaBase;
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

  if (cargando || error || !detalle) {
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
          <div className="space-y-2 p-4">
            {error ? (
              <p className="text-sm text-destructive">Error al cargar: {error}</p>
            ) : (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-24 w-full" />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <FacturaModalShell detalle={detalle} tipoBase={tipoBase} open onOpenChange={onOpenChange} onActualizado={actualizar} />
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
