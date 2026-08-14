"use client";

import { useState } from "react";
import { Receipt, CloseCircle, Hashtag, Calendar, Money, Trash } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EliminarRegistroDialog } from "@/components/eliminar-registro-dialog";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import type { FacturaManualDetalle } from "@/lib/factura-manual";
import { TabPdfEnviar, TabDevolucionRectificativo, TabRectificativo, euros } from "../reparaciones/factura-acciones-tabs";

interface DatosFacturaManualDerivados {
  numeroFactura: string;
  urlFactura: string;
  totalConIva: number;
  clienteNombre: string;
  clienteEmailDefault: string;
  lineasOriginales: { referencia?: string; descripcion: string; cantidad: number; precio: number; descuento?: number }[];
  rectificativa: { numeroFactura: string; urlFactura: string } | null;
  corregida: { numeroFactura: string; urlFactura: string } | null;
  permiteDevolucion: boolean;
  clienteOriginal: { nombre: string; direccion: string; dni: string; telefono: string };
  formaPagoOriginal: string;
}

/**
 * Reproduce _mfaRenderResumen()/mfaGenerarRectificativa()/
 * _mfaAbrirFacturaCorregidaModal() en su rama _isManual (Index.html) —
 * misma forma de datos que derivarDatosFactura() (factura-acciones-tabs.tsx)
 * para poder reutilizar sus mismos componentes de tabs, pero leyendo de
 * FacturaManualDetalle (facturas_manuales) en vez de ReparacionDetalle.
 *
 * vistaRectificativa=true reproduce abrir la fila "rectificativa" propia de
 * una factura manual en la lista — comparte el mismo id/resguardo que la
 * factura manual original (a diferencia de la corregida, que SÍ tiene su
 * propia fila), así que aquí solo se ve su PDF/Enviar, igual que _esRect
 * bloquea Devolución/Rectificativo para cualquier documento que ya sea una
 * rectificativa.
 */
function derivarDatosFacturaManual(detalle: FacturaManualDetalle, vistaRectificativa: boolean): DatosFacturaManualDerivados {
  if (vistaRectificativa) {
    return {
      numeroFactura: detalle.rectificativa?.numeroFactura || "",
      urlFactura: detalle.rectificativa?.urlFactura || "",
      totalConIva: (detalle.rectificativa?.totalFactura || 0) * 1.21,
      clienteNombre: detalle.cliente.nombre,
      clienteEmailDefault: detalle.cliente.email,
      lineasOriginales: [],
      rectificativa: null,
      corregida: null,
      permiteDevolucion: false,
      clienteOriginal: { nombre: detalle.cliente.nombre, direccion: detalle.cliente.direccion, dni: detalle.cliente.dni, telefono: detalle.cliente.telefono },
      formaPagoOriginal: detalle.formaPago,
    };
  }
  return {
    numeroFactura: detalle.numeroFactura,
    urlFactura: detalle.urlFactura,
    totalConIva: detalle.totalFactura * 1.21,
    clienteNombre: detalle.cliente.nombre,
    clienteEmailDefault: detalle.cliente.email,
    lineasOriginales: detalle.lineasFactura.length > 0 ? detalle.lineasFactura : [{ descripcion: "Factura", cantidad: 1, precio: detalle.totalFactura }],
    rectificativa: detalle.rectificativa,
    corregida: detalle.corregida,
    permiteDevolucion: true,
    clienteOriginal: { nombre: detalle.cliente.nombre, direccion: detalle.cliente.direccion, dni: detalle.cliente.dni, telefono: detalle.cliente.telefono },
    formaPagoOriginal: detalle.formaPago,
  };
}

export function FacturaManualModalShell({
  detalle,
  vistaRectificativa,
  open,
  onOpenChange,
  onActualizado,
}: {
  detalle: FacturaManualDetalle;
  vistaRectificativa: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const esSuperadmin = useEsSuperadmin();
  const d = derivarDatosFacturaManual(detalle, vistaRectificativa);
  const apiBase = `/api/facturas-manuales/${detalle.resguardo}/facturas`;
  const fecha = detalle.fechaFactura ? new Date(detalle.fechaFactura).toLocaleDateString("es-ES") : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl" showCloseButton={false}>
        <header className="rounded-t-xl bg-primary px-4 pt-3 pb-2 text-primary-foreground">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Receipt className="size-4.5 shrink-0" />
                <DialogTitle className="text-sm font-bold text-primary-foreground">{d.numeroFactura || "Factura"}</DialogTitle>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                  {vistaRectificativa ? "Rectificativa" : "Manual"}
                </span>
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
          <Tabs defaultValue="pdf" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="pdf">PDF / Enviar</TabsTrigger>
              <TabsTrigger value="devolucion" disabled={!d.permiteDevolucion}>Devolución</TabsTrigger>
              <TabsTrigger value="rectificativo" disabled={!d.permiteDevolucion}>Rectificativo</TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="p-4">
              <TabPdfEnviar
                enviarUrl={null}
                tipo={vistaRectificativa ? "manual_rectificativa" : "manual"}
                numeroFactura={d.numeroFactura}
                urlFactura={d.urlFactura}
                totalFactura={d.totalConIva}
                clienteEmailDefault={d.clienteEmailDefault}
                motivoRectificativa={vistaRectificativa ? detalle.motivoRectificativa : ""}
              />
            </TabsContent>

            {d.permiteDevolucion && (
              <>
                <TabsContent value="devolucion" className="p-4">
                  <TabDevolucionRectificativo
                    resguardo={detalle.resguardo}
                    apiBase={apiBase}
                    tipoDestino="manual_rectificativa"
                    tipoCorr="manual_corregida"
                    numeroFacturaOriginal={d.numeroFactura}
                    lineasOriginales={d.lineasOriginales}
                    clienteOriginal={d.clienteOriginal}
                    formaPagoOriginal={d.formaPagoOriginal}
                    clienteEmailDefault={d.clienteEmailDefault}
                    yaGenerada={d.rectificativa}
                    corregida={d.corregida}
                    modoDevolucion
                    onGenerada={onActualizado}
                  />
                </TabsContent>

                <TabsContent value="rectificativo" className="p-4">
                  <TabRectificativo
                    resguardo={detalle.resguardo}
                    apiBase={apiBase}
                    enviarUrl={null}
                    tipoRect="manual_rectificativa"
                    tipoCorr="manual_corregida"
                    tipoCombinado=""
                    numeroFacturaOriginal={d.numeroFactura}
                    lineasOriginales={d.lineasOriginales}
                    clienteOriginal={d.clienteOriginal}
                    formaPagoOriginal={d.formaPagoOriginal}
                    clienteEmailDefault={d.clienteEmailDefault}
                    rectificativa={d.rectificativa}
                    corregida={d.corregida}
                    onActualizado={onActualizado}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          {esSuperadmin && !vistaRectificativa && (
            <Button variant="destructive" className="mr-auto gap-1.5" onClick={() => setEliminarAbierto(true)}>
              <Trash className="size-4" /> Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>

      {!vistaRectificativa && (
        <EliminarRegistroDialog
          tipo="factura manual"
          id={detalle.resguardo}
          apiUrl={`/api/facturas-manuales/${detalle.resguardo}`}
          open={eliminarAbierto}
          onOpenChange={setEliminarAbierto}
          onEliminado={() => { onOpenChange(false); onActualizado(); }}
        />
      )}
    </Dialog>
  );
}
