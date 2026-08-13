"use client";

import { Receipt, CloseCircle, Hashtag, Calendar, Money } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AlquilerFacturaDetalle } from "@/lib/alquiler-detalle";
import { TabPdfEnviar, TabDevolucionRectificativo, euros } from "../reparaciones/factura-acciones-tabs";

/**
 * Reproduce _mfaRenderResumen()/mfaGenerarRectificativa() en su rama
 * _isAlq (Index.html) para la propia fila de un alquiler en Facturas de
 * Clientes — a diferencia de reparación/manual, el original SOLO muestra
 * "PDF / Enviar" y "Devolución" aquí (nunca "Rectificativo": _esAlq
 * excluye ese tab salvo que el documento ya sea una corregida, que aquí
 * no se ha implementado — es un flujo de corrección de datos más
 * complejo, poco usado, y fuera de alcance de esta pasada).
 *
 * "Devolución" aquí es DISTINTA del flujo "Devolver equipo": anula la
 * factura completa (líneas negativas por meses/semanas/días), sin tocar
 * el estado físico del equipo ni la fianza — para cuando algo salió mal
 * con la factura en sí, no con la devolución del equipo.
 */
export function AlquilerModalShell({
  detalle,
  documentoHistorico,
  open,
  onOpenChange,
  onActualizado,
}: {
  detalle: AlquilerFacturaDetalle;
  /** Si la fila pulsada en la lista es una versión YA SUSTITUIDA de este
      mismo alquiler ("inicial"/"anterior" — mismo resguardo, pero un
      numero_factura distinto del activo), se muestran SUS propios
      número/URL/total en vez de los de la factura activa, y solo el tab
      "PDF / Enviar" — igual que una rectificativa, es un documento
      terminal que no encadena su propia devolución. */
  documentoHistorico?: { numeroFactura: string; urlFactura: string; totalFactura: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const esHistorico = !!documentoHistorico;
  const numeroFactura = documentoHistorico?.numeroFactura || detalle.numeroFactura;
  const urlFactura = documentoHistorico?.urlFactura || detalle.urlFactura;
  // total_cobrado/total_previsto/total_factura_inicial/... ya vienen CON
  // IVA desde kelatos_app.alquileres (subtotal + iva, comprobado contra
  // fila real) — a diferencia de reparaciones/manual, aquí NO hay que
  // multiplicar por 1.21 otra vez.
  const totalConIva = documentoHistorico?.totalFactura ?? detalle.totalFactura;
  const apiBase = `/api/alquileres/${detalle.resguardo}/facturas`;
  const clienteOriginal = { nombre: detalle.cliente.nombre, direccion: detalle.cliente.direccion, dni: detalle.cliente.dni, telefono: detalle.cliente.telefono };
  const lineasOriginales = [
    ...(detalle.duracion.meses > 0 ? [{ descripcion: `Alquiler (${detalle.duracion.meses} ${detalle.duracion.meses > 1 ? "meses" : "mes"})`, cantidad: detalle.duracion.meses, precio: detalle.tarifas.precioMes }] : []),
    ...(detalle.duracion.semanas > 0 ? [{ descripcion: `Alquiler (${detalle.duracion.semanas} ${detalle.duracion.semanas > 1 ? "semanas" : "semana"})`, cantidad: detalle.duracion.semanas, precio: detalle.tarifas.precioSemana }] : []),
    ...(detalle.duracion.dias > 0 ? [{ descripcion: `Alquiler (${detalle.duracion.dias} ${detalle.duracion.dias > 1 ? "días" : "día"})`, cantidad: detalle.duracion.dias, precio: detalle.tarifas.precioDia }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <header className="rounded-t-xl bg-primary px-4 pt-3 pb-2 text-primary-foreground">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Receipt className="size-4.5 shrink-0" />
                <DialogTitle className="text-sm font-bold text-primary-foreground">{numeroFactura || "Factura"}</DialogTitle>
                <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Alquiler</span>
                {esHistorico && <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">Sustituida</span>}
              </div>
              <p className="truncate text-xs text-primary-foreground/70">{detalle.cliente.nombre || "Sin nombre"}</p>
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
            <Calendar className="size-3" /> {detalle.fechaInicio ? new Date(detalle.fechaInicio).toLocaleDateString("es-ES") : "—"}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Money className="size-3" /> {numeroFactura ? euros(totalConIva) : "—"}
          </span>
        </div>

        <div className="p-4">
          <Tabs defaultValue="pdf" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="pdf">PDF / Enviar</TabsTrigger>
              {!esHistorico && <TabsTrigger value="devolucion">Devolución</TabsTrigger>}
            </TabsList>

            <TabsContent value="pdf" className="p-4">
              <TabPdfEnviar
                enviarUrl={null}
                tipo="alquiler"
                numeroFactura={numeroFactura}
                urlFactura={urlFactura}
                totalFactura={totalConIva}
                clienteEmailDefault={detalle.cliente.email}
                motivoRectificativa=""
              />
            </TabsContent>

            {!esHistorico && (
              <TabsContent value="devolucion" className="p-4">
                <TabDevolucionRectificativo
                  resguardo={detalle.resguardo}
                  apiBase={apiBase}
                  tipoDestino="alquiler_rectificativa"
                  tipoCorr=""
                  numeroFacturaOriginal={detalle.numeroFactura}
                  lineasOriginales={lineasOriginales}
                  clienteOriginal={clienteOriginal}
                  formaPagoOriginal={detalle.formaPago}
                  clienteEmailDefault={detalle.cliente.email}
                  yaGenerada={detalle.rectificativa}
                  corregida={detalle.corregida}
                  modoDevolucion
                  permiteCorregida={false}
                  onGenerada={onActualizado}
                />
              </TabsContent>
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
