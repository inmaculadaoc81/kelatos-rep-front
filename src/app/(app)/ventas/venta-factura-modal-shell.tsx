"use client";

import { DocumentText, CloseCircle, Hashtag, Calendar, Money } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Venta } from "@/lib/ventas";
import type { LineaFactura } from "@/lib/factura";
import { TabPdfEnviar, TabDevolucionRectificativo, TabRectificativo, euros } from "../reparaciones/factura-acciones-tabs";

/**
 * Ver/Descargar/Devolución/Rectificativo de la Factura REAL de un pedido
 * (Serie 1/3) — mismas piezas compartidas que reparaciones
 * (TabPdfEnviar/TabDevolucionRectificativo/TabRectificativo), contra los
 * endpoints propios de Ventas (/api/ventas/:ventaId/factura). Petición del
 * usuario, 2026-09-02: "las facturas generadas por pedidos en donde se
 * pueden visualizar, descargar, realizar rectificativas o devolver? No
 * encuentro las opciones" — hasta ahora solo el Ticket de venta tenía este
 * ciclo (VentaTicketModalShell); la Factura real ni siquiera guardaba la
 * URL de su PDF en ningún sitio.
 */
export function VentaFacturaModalShell({
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
  const totalConIva = venta.totalFactura * 1.21;
  // lineas_factura es la foto real tomada al generar la factura; solo cae
  // a items_venta (estado ACTUAL del pedido, puede haber cambiado desde
  // entonces) para facturas anteriores a esta migración, que nunca
  // guardaron esa foto.
  const lineasOriginales: LineaFactura[] =
    venta.lineasFactura.length > 0
      ? venta.lineasFactura
      : venta.items.map((it) => ({ descripcion: it.descripcion, cantidad: 1, precio: it.precio }));
  const clienteOriginal = {
    nombre: venta.clienteFactura?.nombre || venta.clienteNombre || "",
    direccion: venta.clienteFactura?.direccion || "",
    dni: venta.clienteFactura?.dni || "",
    telefono: venta.clienteFactura?.telefono || venta.clienteTelefono || "",
  };
  const clienteEmailDefault = venta.clienteFactura?.email || venta.clienteEmail || "";
  const apiBase = `/api/ventas/${venta.ventaId}/factura`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl" showCloseButton={false}>
        <header className="rounded-t-xl bg-primary px-4 pt-3 pb-2 text-primary-foreground">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <DocumentText className="size-4.5 shrink-0" />
                <DialogTitle className="text-sm font-bold text-primary-foreground">{venta.numeroFactura || "Factura"}</DialogTitle>
                <span className="rounded bg-[#0d6efd] px-1.5 py-0.5 text-[10px] font-semibold text-white">Factura</span>
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
            <Calendar className="size-3" /> {venta.fechaFactura ? new Date(venta.fechaFactura).toLocaleDateString("es-ES") : "—"}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Money className="size-3" /> {euros(totalConIva)}
          </span>
        </div>

        <div className="p-4">
          <Tabs defaultValue="pdf" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="pdf">PDF / Enviar</TabsTrigger>
              <TabsTrigger value="devolucion">Devolución</TabsTrigger>
              <TabsTrigger value="rectificativo">Rectificativo</TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="p-4">
              <TabPdfEnviar
                enviarUrl={null}
                tipo="normal"
                numeroFactura={venta.numeroFactura}
                urlFactura={venta.urlFactura}
                totalFactura={totalConIva}
                clienteEmailDefault={clienteEmailDefault}
                motivoRectificativa=""
              />
            </TabsContent>

            <TabsContent value="devolucion" className="p-4">
              <TabDevolucionRectificativo
                resguardo={`V-${venta.ventaId}`}
                apiBase={apiBase}
                tipoDestino="pedido_rectificativa"
                tipoCorr="pedido_corregida"
                numeroFacturaOriginal={venta.numeroFactura}
                lineasOriginales={lineasOriginales}
                clienteOriginal={clienteOriginal}
                formaPagoOriginal={venta.formaPagoFactura}
                clienteEmailDefault={clienteEmailDefault}
                yaGenerada={venta.facturaRectificativa}
                corregida={venta.facturaCorregida}
                modoDevolucion
                onGenerada={onActualizado}
              />
            </TabsContent>

            <TabsContent value="rectificativo" className="p-4">
              <TabRectificativo
                resguardo={`V-${venta.ventaId}`}
                apiBase={apiBase}
                enviarUrl={null}
                tipoRect="pedido_rectificativa"
                tipoCorr="pedido_corregida"
                tipoCombinado=""
                numeroFacturaOriginal={venta.numeroFactura}
                lineasOriginales={lineasOriginales}
                clienteOriginal={clienteOriginal}
                formaPagoOriginal={venta.formaPagoFactura}
                clienteEmailDefault={clienteEmailDefault}
                rectificativa={venta.facturaRectificativa}
                corregida={venta.facturaCorregida}
                onActualizado={onActualizado}
              />
            </TabsContent>
          </Tabs>
        </div>

        <footer className="flex justify-end border-t bg-muted/50 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
