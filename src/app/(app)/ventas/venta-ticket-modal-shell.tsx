"use client";

import { Ticket, CloseCircle, Hashtag, Calendar, Money } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Venta } from "@/lib/ventas";
import { TabPdfEnviar, TabDevolucionTicket, TabRectificativoTicket, euros, type DocTicket } from "../reparaciones/factura-acciones-tabs";

interface DatosVentaTicketDerivados {
  numeroTicket: string;
  urlTicket: string;
  totalConIva: number;
  rectificativa: DocTicket | null;
  corregida: DocTicket | null;
  permiteDevolucion: boolean;
}

/**
 * Igual que TicketManualModalShell — reutiliza las mismas piezas
 * (TabPdfEnviar/TabDevolucionTicket/TabRectificativoTicket) contra los
 * endpoints propios de Ventas (/v1/ventas/:ventaId/ticket-venta/...),
 * petición del usuario, 2026-08-27: "en ventas también implementa
 * tickets" — mismo ciclo completo que ya tienen reparación/revisión/
 * Ticket Manual. A diferencia de esos, aquí `venta` ya viene cargada
 * (detalle-venta-dialog.tsx la tiene en estado), no hace falta un fetch
 * propio por id.
 */
export function VentaTicketModalShell({
  venta,
  open,
  onOpenChange,
  onActualizado,
}: {
  venta: Venta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const d: DatosVentaTicketDerivados = {
    numeroTicket: venta.numeroTicket,
    urlTicket: venta.urlTicket,
    totalConIva: venta.totalTicket * 1.21,
    rectificativa: venta.ticketRectificativa,
    corregida: venta.ticketCorregida,
    permiteDevolucion: true,
  };
  const apiRectificativaUrl = `/api/ventas/${venta.ventaId}/ticket-venta/rectificativa`;
  const apiCorregidaUrl = `/api/ventas/${venta.ventaId}/ticket-venta/corregida`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl" showCloseButton={false}>
        <header className="rounded-t-xl bg-primary px-4 pt-3 pb-2 text-primary-foreground">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Ticket className="size-4.5 shrink-0" />
                <DialogTitle className="text-sm font-bold text-primary-foreground">{d.numeroTicket || "Ticket"}</DialogTitle>
                <span className="rounded bg-[#20c997] px-1.5 py-0.5 text-[10px] font-semibold text-white">Ticket</span>
              </div>
              <p className="truncate text-xs text-primary-foreground/70">{venta.clienteNombre || "Sin nombre"}</p>
            </div>
            <Button variant="ghost" size="icon-sm" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={() => onOpenChange(false)}>
              <CloseCircle className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b bg-primary/5 px-4 py-2">
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            <Hashtag className="size-3" /> Pedido #{venta.ventaId}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" /> {venta.fecha ? new Date(venta.fecha).toLocaleDateString("es-ES") : "—"}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Money className="size-3" /> {d.numeroTicket ? euros(d.totalConIva) : "—"}
          </span>
        </div>

        <div className="p-4">
          <Tabs defaultValue="pdf" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="pdf">PDF / Enviar</TabsTrigger>
              <TabsTrigger value="devolucion" disabled={!d.permiteDevolucion}>Devolución</TabsTrigger>
              <TabsTrigger value="rectificativo" disabled={!d.permiteDevolucion}>Rectificativo</TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="p-4">
              <TabPdfEnviar
                enviarUrl={null}
                tipo="ticket"
                numeroFactura={d.numeroTicket}
                urlFactura={d.urlTicket}
                totalFactura={d.totalConIva}
                clienteEmailDefault=""
                motivoRectificativa=""
              />
            </TabsContent>

            {d.permiteDevolucion && (
              <>
                <TabsContent value="devolucion" className="p-4">
                  <TabDevolucionTicket
                    apiRectificativaUrl={apiRectificativaUrl}
                    apiCorregidaUrl={apiCorregidaUrl}
                    contexto={`Pedido #${venta.ventaId}`}
                    numeroTicketOriginal={d.numeroTicket}
                    lineasIniciales={venta.lineasTicket}
                    formaPagoOriginal={venta.formaPagoTicket}
                    yaGenerada={d.rectificativa}
                    corregida={d.corregida}
                    onGenerada={onActualizado}
                  />
                </TabsContent>
                <TabsContent value="rectificativo" className="p-4">
                  <TabRectificativoTicket
                    apiRectificativaUrl={apiRectificativaUrl}
                    apiCorregidaUrl={apiCorregidaUrl}
                    contexto={`Pedido #${venta.ventaId}`}
                    numeroTicketOriginal={d.numeroTicket}
                    lineasIniciales={venta.lineasTicket}
                    formaPagoOriginal={venta.formaPagoTicket}
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
