"use client";

import { Ticket, CloseCircle, Hashtag, Calendar, Money } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TicketManualDetalle } from "@/lib/ticket-manual";
import { TabPdfEnviar, TabDevolucionTicket, TabRectificativoTicket, euros, RECTIFICATIVA_TICKETS_HABILITADA, type DocTicket } from "../reparaciones/factura-acciones-tabs";

export type VistaTicketManual = "ticket" | "rectificativa" | "corregida";

interface DatosTicketManualDerivados {
  numeroTicket: string;
  urlTicket: string;
  totalConIva: number;
  rectificativa: DocTicket | null;
  corregida: DocTicket | null;
  permiteDevolucion: boolean;
}

/**
 * Igual que derivarDatosFacturaManual() (factura-manual-modal-shell.tsx),
 * pero para "Ticket Manual" — un ticket manual comparte fila (mismo id)
 * entre las 3 vistas de la lista (ticket/rectificativa/corregida), a
 * diferencia de una factura manual (cuya corregida sí tiene fila propia).
 * "corregida" reutiliza la misma regla hayCicloPosterior que corregida_ticket
 * (factura-acciones-tabs.tsx): SÍ se puede volver a rectificar/corregir.
 */
function derivarDatosTicketManual(detalle: TicketManualDetalle, vista: VistaTicketManual): DatosTicketManualDerivados {
  if (vista === "rectificativa") {
    return {
      numeroTicket: detalle.rectificativa?.numeroFactura || "",
      urlTicket: detalle.rectificativa?.urlFactura || "",
      totalConIva: (detalle.rectificativa?.totalFactura || 0) * 1.21,
      rectificativa: null,
      corregida: null,
      permiteDevolucion: false,
    };
  }
  if (vista === "corregida") {
    const doc = detalle.corregida;
    const rectBase = detalle.rectificativa;
    const hayCicloPosterior = !!(rectBase?.fechaFactura && doc?.fechaFactura && new Date(rectBase.fechaFactura) > new Date(doc.fechaFactura));
    return {
      numeroTicket: doc?.numeroFactura || "",
      urlTicket: doc?.urlFactura || "",
      totalConIva: (doc?.totalFactura || 0) * 1.21,
      rectificativa: hayCicloPosterior ? rectBase : null,
      corregida: null,
      permiteDevolucion: true,
    };
  }
  return {
    numeroTicket: detalle.numeroTicket,
    urlTicket: detalle.urlTicket,
    totalConIva: detalle.totalTicket * 1.21,
    rectificativa: detalle.rectificativa,
    corregida: detalle.corregida,
    permiteDevolucion: true,
  };
}

export function TicketManualModalShell({
  detalle,
  vista,
  open,
  onOpenChange,
  onActualizado,
}: {
  detalle: TicketManualDetalle;
  vista: VistaTicketManual;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const d = derivarDatosTicketManual(detalle, vista);
  const apiRectificativaUrl = `/api/tickets-manuales/${detalle.id}/rectificativa`;
  const apiCorregidaUrl = `/api/tickets-manuales/${detalle.id}/corregida`;
  const apiEnviarUrl = `/api/tickets-manuales/${detalle.id}/enviar`;
  const tipoEnviar = vista === "rectificativa" ? "rectificativa_ticket" : vista === "corregida" ? "corregida_ticket" : "ticket";
  const fecha = detalle.fechaTicket ? new Date(detalle.fechaTicket).toLocaleDateString("es-ES") : "—";
  const etiquetaVista = vista === "rectificativa" ? "Rectificativa" : vista === "corregida" ? "Corregida" : "Ticket Manual";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl" showCloseButton={false}>
        <header className="rounded-t-xl bg-primary px-4 pt-3 pb-2 text-primary-foreground">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Ticket className="size-4.5 shrink-0" />
                <DialogTitle className="text-sm font-bold text-primary-foreground">{d.numeroTicket || "Ticket"}</DialogTitle>
                <span className="rounded bg-[#20c997] px-1.5 py-0.5 text-[10px] font-semibold text-white">{etiquetaVista}</span>
              </div>
              <p className="truncate text-xs text-primary-foreground/70">
                {[detalle.clienteNombre, detalle.clienteEmail].filter(Boolean).join(" · ") || "Sin datos de cliente"}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={() => onOpenChange(false)}>
              <CloseCircle className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b bg-primary/5 px-4 py-2">
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            <Hashtag className="size-3" /> Ref. {detalle.id}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" /> {fecha}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Money className="size-3" /> {d.numeroTicket ? euros(d.totalConIva) : "—"}
          </span>
        </div>

        <div className="p-4">
          <Tabs defaultValue="pdf" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="pdf">PDF / Enviar</TabsTrigger>
              {RECTIFICATIVA_TICKETS_HABILITADA && (
                <>
                  <TabsTrigger value="devolucion" disabled={!d.permiteDevolucion}>Devolución</TabsTrigger>
                  <TabsTrigger value="rectificativo" disabled={!d.permiteDevolucion}>Rectificativo</TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="pdf" className="p-4">
              <TabPdfEnviar
                enviarUrl={apiEnviarUrl}
                tipo={tipoEnviar}
                numeroFactura={d.numeroTicket}
                urlFactura={d.urlTicket}
                totalFactura={d.totalConIva}
                clienteEmailDefault={detalle.clienteEmail}
                confirmarAntesDeEnviar
                motivoRectificativa={vista === "rectificativa" ? detalle.motivoRectificativa : ""}
              />
            </TabsContent>

            {d.permiteDevolucion && RECTIFICATIVA_TICKETS_HABILITADA && (
              <>
                <TabsContent value="devolucion" className="p-4">
                  <TabDevolucionTicket
                    apiRectificativaUrl={apiRectificativaUrl}
                    apiCorregidaUrl={apiCorregidaUrl}
                    contexto={`Ticket Manual ${detalle.numeroTicket}`}
                    numeroTicketOriginal={d.numeroTicket}
                    lineasIniciales={detalle.lineasTicket}
                    formaPagoOriginal={detalle.formaPagoTicket}
                    yaGenerada={d.rectificativa}
                    corregida={d.corregida}
                    onGenerada={onActualizado}
                  />
                </TabsContent>
                <TabsContent value="rectificativo" className="p-4">
                  <TabRectificativoTicket
                    apiRectificativaUrl={apiRectificativaUrl}
                    apiCorregidaUrl={apiCorregidaUrl}
                    contexto={`Ticket Manual ${detalle.numeroTicket}`}
                    numeroTicketOriginal={d.numeroTicket}
                    lineasIniciales={detalle.lineasTicket}
                    formaPagoOriginal={detalle.formaPagoTicket}
                    rectificativa={d.rectificativa}
                    corregida={d.corregida}
                    onActualizado={onActualizado}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        <footer className="flex justify-end border-t bg-muted/50 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
