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
import type { FacturaManualDetalle } from "@/lib/factura-manual";
import type { TicketManualDetalle } from "@/lib/ticket-manual";
import type { AlquilerFacturaDetalle } from "@/lib/alquiler-detalle";
import { FacturaModalShell } from "../reparaciones/factura-modal-shell";
import type { TipoFacturaBase } from "../reparaciones/factura-acciones-tabs";
import { FacturaManualModalShell } from "./factura-manual-modal-shell";
import { TicketManualModalShell, type VistaTicketManual } from "./ticket-manual-modal-shell";
import { AlquilerModalShell } from "./alquiler-modal-shell";

/**
 * Resuelve a qué tipoBase corresponde una fila de la lista — para
 * rectificativa/corregida hace falta tipoOriginal (reparación o revisión)
 * porque ambas colapsan al mismo "tipo" visible en la lista, pero son
 * documentos distintos (numero_factura_rectificativa vs. ..._revision).
 * Recogida/venta no tienen un resguardo de reparación real — se quedan en
 * la vista simple, fuera de alcance. Manual y Alquiler tienen su propio
 * recorrido (DetalleFacturaManualConTabs/DetalleFacturaAlquilerConTabs más
 * abajo), no pasan por aquí.
 */
function resolverTipoBase(factura: FacturaCliente): TipoFacturaBase | null {
  if (factura.esAlquiler || factura.esManual || factura.esTicketManual) return null;
  // Una rectificativa/corregida de venta comparte "resguardo" con el
  // venta_id, no con un resguardo de reparación real — dejarla caer en las
  // ramas de abajo intentaría leer /api/reparaciones/:resguardo con ese
  // mismo número, arriesgando mostrar el detalle de OTRA reparación real
  // que coincida por casualidad en el mismo id (ambas secuencias son
  // independientes). Se queda en DetalleFacturaSimple, igual que la fila
  // base "venta".
  if (factura.tipoOriginal === "venta") return null;
  switch (factura.tipo) {
    case "reparacion": return "normal";
    case "revision": return factura.esTicket ? "ticket_revision" : "revision";
    case "mensajeria": return "mensajeria";
    case "anticipo": return "anticipo";
    case "ticket": return "ticket";
    case "rectificativa":
      return factura.tipoOriginal === "revision" ? "rectificativa_revision"
        : factura.tipoOriginal === "ticket" ? "rectificativa_ticket"
        : factura.tipoOriginal === "ticket_revision" ? "rectificativa_ticket_revision"
        : "rectificativa";
    case "corregida":
      return factura.tipoOriginal === "revision" ? "corregida_revision"
        : factura.tipoOriginal === "ticket" ? "corregida_ticket"
        : factura.tipoOriginal === "ticket_revision" ? "corregida_ticket_revision"
        : "corregida";
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

  if (factura.esManual) {
    return (
      <DetalleFacturaManualConTabs
        key={factura.resguardo + factura.tipo}
        factura={factura}
        onOpenChange={onOpenChange}
        onActualizado={onCobrada}
      />
    );
  }

  if (factura.esTicketManual) {
    return (
      <DetalleTicketManualConTabs
        key={factura.resguardo + factura.tipo}
        factura={factura}
        onOpenChange={onOpenChange}
        onActualizado={onCobrada}
      />
    );
  }

  // "rectificativa" y "recogida" son documentos terminales (igual que
  // _esRect) o facturas fijas aparte — se quedan en la vista simple.
  if (factura.esAlquiler && factura.tipo === "alquiler") {
    return (
      <DetalleFacturaAlquilerConTabs
        key={factura.resguardo + factura.tipo}
        factura={factura}
        onOpenChange={onOpenChange}
        onActualizado={onCobrada}
      />
    );
  }

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

/**
 * Reproduce abrirModalFcAcciones() en su rama _isManual — misma cabecera y
 * tabs que DetalleFacturaConTabs, pero leyendo /api/facturas-manuales/:id
 * en vez de /api/reparaciones/:resguardo. La fila "rectificativa" propia
 * de una factura manual comparte el mismo id que la manual original (a
 * diferencia de la corregida, que sí tiene fila propia) — vistaRectificativa
 * distingue cuál de las dos se está viendo con los mismos datos ya cargados.
 */
function DetalleFacturaManualConTabs({
  factura,
  onOpenChange,
  onActualizado,
}: {
  factura: FacturaCliente;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const [detalle, setDetalle] = useState<FacturaManualDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const vistaRectificativa = factura.tipo === "rectificativa";

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/facturas-manuales/${encodeURIComponent(factura.resguardo)}`);
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
    <FacturaManualModalShell detalle={detalle} vistaRectificativa={vistaRectificativa} open onOpenChange={onOpenChange} onActualizado={actualizar} />
  );
}

/**
 * Igual que DetalleFacturaManualConTabs, pero para "Ticket Manual"
 * (kelatos_app.tickets_manuales) — lee /api/tickets-manuales/:id. A
 * diferencia de una factura manual, un ticket manual comparte el MISMO id
 * entre sus 3 vistas de lista (ticket/rectificativa/corregida) — "vista"
 * distingue cuál de las tres se está viendo con los mismos datos cargados.
 */
function DetalleTicketManualConTabs({
  factura,
  onOpenChange,
  onActualizado,
}: {
  factura: FacturaCliente;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const [detalle, setDetalle] = useState<TicketManualDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const vista: VistaTicketManual = factura.tipo === "rectificativa" ? "rectificativa" : factura.tipo === "corregida" ? "corregida" : "ticket";

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets-manuales/${encodeURIComponent(factura.resguardo)}`);
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
            <DialogTitle className="text-sm font-semibold text-primary-foreground">{factura.numero}</DialogTitle>
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
    <TicketManualModalShell detalle={detalle} vista={vista} open onOpenChange={onOpenChange} onActualizado={actualizar} />
  );
}

/**
 * Reproduce abrirModalFcAcciones() en su rama _isAlq — misma cabecera que
 * el resto, pero leyendo /api/alquileres/:id en vez de /api/reparaciones o
 * /api/facturas-manuales. Solo PDF/Enviar + Devolución (ver
 * AlquilerModalShell) — el original tampoco muestra "Rectificativo" para
 * la factura base de un alquiler.
 */
function DetalleFacturaAlquilerConTabs({
  factura,
  onOpenChange,
  onActualizado,
}: {
  factura: FacturaCliente;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const [detalle, setDetalle] = useState<AlquilerFacturaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/alquileres/${encodeURIComponent(factura.resguardo)}`);
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

  // La fila pulsada puede ser la factura ACTIVA del alquiler o una de sus
  // versiones históricas ("inicial"/"anterior", mismo resguardo — ver
  // Pasadas 8-ter/10 en facturas-cliente.ts): GET /api/alquileres/:id
  // siempre devuelve el estado ACTUAL. Si el número no coincide con el que
  // se pulsó, se busca cuál de los dos documentos históricos es (mismo
  // modal con tabs, pero solo lectura con SUS propios datos — nunca los de
  // la factura activa). Si no coincide con ninguno (no debería pasar), cae
  // a la vista simple como red de seguridad.
  if (detalle.numeroFactura !== factura.numero) {
    const historico = detalle.inicial?.numeroFactura === factura.numero ? detalle.inicial
      : detalle.anterior?.numeroFactura === factura.numero ? detalle.anterior
      : null;
    if (!historico) {
      return <DetalleFacturaSimple factura={factura} onOpenChange={onOpenChange} onCobrada={onActualizado} />;
    }
    return (
      <AlquilerModalShell detalle={detalle} documentoHistorico={historico} open onOpenChange={onOpenChange} onActualizado={actualizar} />
    );
  }

  return (
    <AlquilerModalShell detalle={detalle} open onOpenChange={onOpenChange} onActualizado={actualizar} />
  );
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
