"use client";

import { useState } from "react";
import { Receipt, CloseCircle, Hashtag, Calendar, Money, Trash } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EliminarRegistroDialog } from "@/components/eliminar-registro-dialog";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import type { AlquilerFacturaDetalle } from "@/lib/alquiler-detalle";
import { TabPdfEnviar, TabDevolucionRectificativo, euros } from "../reparaciones/factura-acciones-tabs";

/**
 * Reproduce _mfaRenderResumen()/mfaGenerarRectificativa() en su rama
 * _isAlq (Index.html) para la propia fila de un alquiler en Facturas de
 * Clientes — a diferencia de reparación/manual, el original solo muestra
 * "PDF / Enviar" y "Devolución" como pestañas propias; el ciclo de
 * corrección (_apiGenerarFacturaCorregidaAlquiler) se ofrece DESPUÉS de
 * generar la rectificativa, igual que en reparaciones ("¿Generaste la
 * rectificativa por error?" dentro de TabDevolucionRectificativo).
 *
 * "Devolución" aquí es DISTINTA del flujo "Devolver equipo": anula la
 * factura completa (líneas negativas por meses/semanas/días), sin tocar
 * el estado físico del equipo ni la fianza — para cuando algo salió mal
 * con la factura en sí, no con la devolución del equipo. Si tras anularla
 * se genera la corregida, el backend reescribe meses/semanas/dias del
 * alquiler con los datos ya corregidos, para que una devolución física
 * posterior (ajuste de duración) parta de esos datos, no de los erróneos
 * originales.
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
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const esSuperadmin = useEsSuperadmin();
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
  // La duración (meses/semanas/días) ya no se prellena aquí como línea de
  // texto libre — FaseCorregida la calcula sola a partir de duracionAlquiler
  // (mismos campos Meses/Semanas/Días que "Nuevo Alquiler"), evitando que
  // haya que escribir a mano "Alquiler (2 semanas)" para que el backend la
  // detecte al resincronizar el alquiler.
  const lineasOriginales = [
    // La fianza sí se precarga editable (a diferencia de envío/recogida): la
    // factura original la incluía como parte de lo cobrado, así que la
    // corregida —que sustituye a esa factura por completo— debe seguir
    // reflejándola salvo que el usuario la borre a propósito (p.ej. si ya se
    // devolvió antes de corregir).
    ...(detalle.fianzaCobrada > 0 ? [{ descripcion: "Fianza", cantidad: 1, precio: detalle.fianzaCobrada }] : []),
    // Informativas a 0 € — el envío/recogida ya se cobró (o fue gratis) una
    // sola vez y no se debe recobrar al corregir, pero debe seguir
    // apareciendo para que los reportes de envíos facturados no lo pierdan.
    ...(detalle.envioActivado ? [{ descripcion: "Envío a domicilio", cantidad: 1, precio: 0 }] : []),
    ...(detalle.recogidaActivada ? [{ descripcion: "Recogida a domicilio", cantidad: 1, precio: 0 }] : []),
  ];
  const duracionAlquiler = { inicial: detalle.duracion, tarifas: detalle.tarifas, equipoNombre: detalle.equipoNombre || "Equipo" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl" showCloseButton={false}>
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
                  tipoCorr="alquiler_corregida"
                  numeroFacturaOriginal={detalle.numeroFactura}
                  lineasOriginales={lineasOriginales}
                  clienteOriginal={clienteOriginal}
                  formaPagoOriginal={detalle.formaPago}
                  clienteEmailDefault={detalle.cliente.email}
                  // detalle.rectificativa viene de numero_factura_rectificativa,
                  // un ÚNICO campo en kelatos_app.alquileres reutilizado para
                  // todo el ciclo de vida del alquiler — tras un ajuste de
                  // duración (detalle.inicial ya poblado: la factura activa
                  // sustituyó a otra anterior), ese campo sigue apuntando a la
                  // rectificativa de la factura VIEJA, no de la activa actual.
                  // Mostrarlo bloqueaba "Devolución" en la factura nueva con la
                  // rectificativa de otra factura ya sustituida (bug real,
                  // alquiler ALQ-0043: factura 1-004881 bloqueada por la
                  // rectificativa 3-000238 de la factura 1-004874 que
                  // sustituyó). Mismo criterio "esPostAjuste" que ya usa
                  // /api/alquileres/[id]/facturas/route.ts (rama
                  // alquiler_rectificativa) para no bloquear en el backend.
                  yaGenerada={detalle.inicial ? null : detalle.rectificativa}
                  corregida={detalle.corregida}
                  modoDevolucion
                  duracionAlquiler={duracionAlquiler}
                  onGenerada={onActualizado}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          {esSuperadmin && !esHistorico && (
            <Button variant="destructive" className="mr-auto gap-1.5" onClick={() => setEliminarAbierto(true)}>
              <Trash className="size-4" /> Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </footer>
      </DialogContent>

      <EliminarRegistroDialog
        tipo="alquiler"
        id={detalle.resguardo}
        apiUrl={`/api/alquileres/${detalle.resguardo}`}
        open={eliminarAbierto}
        onOpenChange={setEliminarAbierto}
        onEliminado={() => { onOpenChange(false); onActualizado(); }}
      />
    </Dialog>
  );
}
