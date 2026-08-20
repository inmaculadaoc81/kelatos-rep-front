"use client";

import { useEffect, useState } from "react";
import { DocumentText, Box, ShoppingCart, Calendar, Send2, InfoCircle } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pedido, Presupuesto } from "@/lib/reparacion-detalle";
import { Proveedor } from "@/app/api/proveedores/route";
import { esUrlValida } from "@/lib/validacion";

function euros(n: number): string {
  return (n || 0).toFixed(2) + " €";
}

function fecha(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("es-ES") : "—";
}

function fechaHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-ES")} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-normal text-muted-foreground">{etiqueta}</p>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{valor || "—"}</div>
    </div>
  );
}

/**
 * Muchos "enlace de compra" guardados en producción no son en realidad una
 * URL — a veces se anotó ahí el código/número de pedido del proveedor. Se
 * muestra siempre el valor tal cual se guardó (no una etiqueta genérica
 * como "Ver enlace"), en azul; solo se convierte en <a> clicable cuando de
 * verdad tiene forma de URL, para no llevar a ningún sitio al pulsarlo.
 */
function EnlaceOTexto({ valor }: { valor: string }) {
  if (!valor) return <>—</>;
  if (esUrlValida(valor)) {
    return (
      <a href={valor} target="_blank" rel="noreferrer" className="break-all text-primary underline">
        {valor}
      </a>
    );
  }
  return <span className="break-all text-primary">{valor}</span>;
}

/**
 * "Ver detalles" de un presupuesto — reproduce la misma disposición que
 * PresupuestoFormDialog (Nuevo/Editar presupuesto) pero de solo lectura,
 * para poder revisar exactamente lo que se rellenó al crearlo sin riesgo de
 * modificarlo por error. Las piezas "por pedido" muestran además, si ya se
 * registró la compra, los datos reales del pedido (proveedor, enlace,
 * número de pedido, fecha estimada) con el mismo layout que "Editar
 * Pedido" — enlazados por Pedido.piezaId, ya que un Pedido es una entidad
 * aparte del Presupuesto (ver Pedido en reparacion-detalle.ts).
 */
export function PresupuestoDetalleDialog({
  resguardo,
  presupuesto: p,
  pedidos,
  open,
  onOpenChange,
}: {
  resguardo: string;
  presupuesto: Presupuesto;
  pedidos: Pedido[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/proveedores").then((r) => r.json()).then((d) => { if (d.ok) setProveedores(d.proveedores); }).catch(() => {});
  }, [open]);

  function nombreProveedor(id: string): string {
    if (!id) return "—";
    return proveedores.find((pv) => pv.proveedorId === id)?.nombre || id;
  }

  const piezasStock = p.piezas.filter((pz) => pz.tipo !== "pedido");
  const piezasPedido = p.piezas.filter((pz) => pz.tipo === "pedido");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentText className="size-5" /> Presupuesto v{p.version} — #{resguardo}
            <Badge variant="outline">{p.estado}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-4 pr-3">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-primary">Responsable del Presupuesto</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Campo etiqueta="Responsable" valor={p.elaboradoPor} />
                <Campo etiqueta="Fecha de Elaboración" valor={fecha(p.fechaElaboracion)} />
                <Campo etiqueta="Días de Reparación" valor={p.diasEntrega ? String(p.diasEntrega) : "—"} />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-normal text-muted-foreground">Diagnóstico del equipo (enviado al cliente)</p>
              <div className="whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-sm">{p.descripcion || "—"}</div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-primary">Costos del Presupuesto</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Campo etiqueta="Mano de Obra" valor={euros(p.manoObra)} />
                <Campo etiqueta="Costo Piezas (nuestro)" valor={euros(p.costoPiezas)} />
                <Campo etiqueta="Total al Cliente" valor={euros(p.total)} />
                <Campo etiqueta="Ganancia Neta" valor={euros(p.gananciaNeta)} />
              </div>
            </div>

            {piezasStock.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-sky-500/40">
                <div className="flex items-center gap-1.5 bg-sky-500/10 px-3 py-2 text-sm font-medium">
                  <Box className="size-4 text-sky-600" /> Piezas en Stock
                </div>
                <div className="space-y-3 p-3">
                  {piezasStock.map((pz) => (
                    <div key={pz.piezaId} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Campo etiqueta="REF" valor={pz.referenciaStock} />
                      <Campo etiqueta="Nombre de la pieza" valor={pz.descripcion} />
                      <Campo etiqueta="Coste (nuestro)" valor={euros(pz.costo)} />
                      <Campo etiqueta="Precio cliente" valor={euros(pz.precio)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {piezasPedido.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-amber-500/40">
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-2 text-sm font-medium">
                  <ShoppingCart className="size-4 text-amber-600" /> Piezas a Pedir
                </div>
                <div className="space-y-3 p-3">
                  {piezasPedido.map((pz, i) => {
                    const pedidosPieza = pedidos.filter((pd) => pd.piezaId === pz.piezaId);
                    return (
                      <div key={pz.piezaId} className="rounded-md border">
                        <div className="rounded-t-md bg-muted/60 px-3 py-1.5">
                          <strong className="text-xs">Pieza #{i + 1} — {pz.descripcion || "—"}</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
                          <Campo etiqueta="Costo (nuestro)" valor={euros(pz.costo)} />
                          <Campo etiqueta="Precio cliente" valor={euros(pz.precio)} />
                          <Campo etiqueta="Proveedor" valor={nombreProveedor(pz.proveedorId)} />
                          <Campo etiqueta="Enlace de compra" valor={<EnlaceOTexto valor={pz.enlace} />} />
                        </div>

                        {/* Datos reales de la compra — vienen de Pedido, no del
                            Presupuesto (Pedido.piezaId es el único enlace entre
                            ambos, ver reparacion-detalle.ts). Mismo layout que
                            "Editar Pedido" (registrar-pedido-dialog.tsx), aquí
                            de solo lectura. */}
                        {pedidosPieza.length > 0 ? (
                          <div className="space-y-2 border-t bg-muted/20 p-3">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                              <Box className="size-3.5" /> Pedido registrado
                            </p>
                            {pedidosPieza.map((pd) => (
                              <div key={pd.pedidoId} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                <Campo etiqueta="Proveedor" valor={nombreProveedor(pd.proveedorId)} />
                                <Campo etiqueta="Enlace de Compra" valor={<EnlaceOTexto valor={pd.enlace} />} />
                                <Campo etiqueta="Número de Pedido" valor={pd.numeroPedido} />
                                <Campo etiqueta="Fecha de Pedido" valor={fecha(pd.fechaPedido)} />
                                <Campo etiqueta="Fecha Estimada de Entrega" valor={fecha(pd.fechaEstimada)} />
                                <Campo etiqueta="Estado" valor={<Badge variant="outline">{pd.estado}</Badge>} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            Todavía no se ha registrado el pedido de esta pieza.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {p.notas && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-normal text-muted-foreground">Notas</p>
                <div className="whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{p.notas}</div>
              </div>
            )}

            <div className="space-y-1 text-xs text-muted-foreground">
              {p.fechaElaboracion && (
                <p className="flex items-center gap-1">
                  <Calendar className="size-3.5 shrink-0" /> Elaborado: {fecha(p.fechaElaboracion)} por {p.elaboradoPor || "—"}
                </p>
              )}
              {p.fechaEnvio && (
                <p className="flex items-center gap-1">
                  <Send2 className="size-3.5 shrink-0" /> Enviado: {fechaHora(p.fechaEnvio)}
                </p>
              )}
              {p.fechaRespuesta && (
                <p className="flex items-center gap-1">
                  <InfoCircle className="size-3.5 shrink-0" /> Respuesta: {fecha(p.fechaRespuesta)}
                </p>
              )}
            </div>

            {p.motivoRechazo && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <strong>Motivo:</strong> {p.motivoRechazo}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
