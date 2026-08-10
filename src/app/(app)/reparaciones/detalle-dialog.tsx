"use client";

import { useEffect, useState } from "react";
import { BoxSearch, Send2, Setting2, BoxTick, DocumentText, ScanBarcode } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { COLOR_ESTADO } from "@/lib/reparaciones";
import { formatearFecha } from "@/lib/dias-entrega";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { LogisticaPanel } from "./logistica-panel";
import { FinalizarReparacionDialog, MarcarEntregadoDialog } from "./finalizar-dialog";
import { EstadosEspecialesPanel } from "./estados-especiales-panel";
import { PresupuestoCard } from "./presupuesto-card";
import { PresupuestoFormDialog } from "./presupuesto-form-dialog";
import { QrRecogidaDialog } from "./qr-recogida-dialog";

const ESTADOS_ENTREGA_PERMITIDOS = ["Reparado", "Presupuesto Rechazado", "No tiene Reparación", "Presupuesto Enviado"];

function EstadoBadge({ estado }: { estado: string }) {
  const color = COLOR_ESTADO[estado];
  if (!color) return <Badge variant="secondary">{estado}</Badge>;
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {estado}
    </span>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{valor || "-"}</p>
    </div>
  );
}

export function DetalleReparacionDialog({
  resguardo,
  onOpenChange,
}: {
  resguardo: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [detalle, setDetalle] = useState<ReparacionDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [enviandoObservacion, setEnviandoObservacion] = useState(false);
  const [finalizarAbierto, setFinalizarAbierto] = useState(false);
  const [entregaAbierta, setEntregaAbierta] = useState(false);
  const [nuevoPresupuestoAbierto, setNuevoPresupuestoAbierto] = useState(false);
  const [qrAbierto, setQrAbierto] = useState(false);

  function cargarDetalle() {
    if (!resguardo) return;
    fetch(`/api/reparaciones/${resguardo}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error);
        setDetalle(data.detalle as ReparacionDetalle);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error desconocido"));
  }

  useEffect(() => {
    if (!resguardo) return;
    setDetalle(null);
    setError(null);
    setNuevaObservacion("");
    cargarDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resguardo]);

  async function enviarObservacion() {
    if (!resguardo || !nuevaObservacion.trim()) return;
    setEnviandoObservacion(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/observaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: nuevaObservacion }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setNuevaObservacion("");
      cargarDetalle();
      toast.success("Observación añadida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviandoObservacion(false);
    }
  }

  return (
    <Dialog open={resguardo !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BoxSearch className="size-5" />
            Reparación #{resguardo}
            {detalle && <EstadoBadge estado={detalle.estado} />}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Error al cargar el detalle: {error}
          </div>
        )}

        {!detalle && !error && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {detalle && (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 pr-3">
              <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Cliente</p>
                  <Campo label="Nombre" valor={detalle.cliente.nombre} />
                  <Campo label="Teléfono" valor={detalle.cliente.telefono} />
                  <Campo label="Email" valor={detalle.cliente.email} />
                  <Campo label="Dirección" valor={detalle.cliente.direccion} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Equipo</p>
                  <Campo label="Modelo" valor={detalle.equipo.modelo} />
                  <Campo label="Síntoma" valor={detalle.equipo.sintoma} />
                  <Campo label="Técnico asignado" valor={detalle.tecnicoAsignado} />
                  <Campo label="Recepción en local" valor={detalle.equipoEnLocal} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-4">
                <Campo label="Fecha recepción" valor={formatearFecha(detalle.fechaRecepcion)} />
                <Campo label="Fecha entrega" valor={formatearFecha(detalle.fechaEntrega)} />
                <Campo label="Estado entrega" valor={detalle.estadoEntrega} />
                <Campo label="Nº factura" valor={detalle.numeroFactura} />
              </div>

              <LogisticaPanel detalle={detalle} onActualizado={cargarDetalle} />

              {(detalle.estado === "En Reparación" || ESTADOS_ENTREGA_PERMITIDOS.includes(detalle.estado)) && (
                <div className="flex gap-2">
                  {detalle.estado === "En Reparación" && (
                    <Button size="sm" className="gap-1.5" onClick={() => setFinalizarAbierto(true)}>
                      <Setting2 className="size-3.5" /> Finalizar reparación
                    </Button>
                  )}
                  {ESTADOS_ENTREGA_PERMITIDOS.includes(detalle.estado) && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEntregaAbierta(true)}>
                        <BoxTick className="size-3.5" /> Marcar como entregado
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setQrAbierto(true)}>
                        <ScanBarcode className="size-3.5" /> Ver QR de recogida
                      </Button>
                    </>
                  )}
                </div>
              )}

              <EstadosEspecialesPanel detalle={detalle} onActualizado={cargarDetalle} />

              <Tabs defaultValue="informacion">
                <TabsList>
                  <TabsTrigger value="informacion">Información</TabsTrigger>
                  <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
                  <TabsTrigger value="historial">Historial</TabsTrigger>
                </TabsList>

                <TabsContent value="informacion" className="space-y-4 pt-3">
                  <div>
                    <p className="mb-2 text-sm font-semibold">Presupuestos ({detalle.presupuestos.length})</p>
                    {detalle.presupuestos.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin presupuestos.</p>
                    )}
                    <div className="space-y-2">
                      {detalle.presupuestos.map((p) => (
                        <PresupuestoCard key={p.presupuestoId} resguardo={detalle.resguardo} presupuesto={p} onActualizado={cargarDetalle} />
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => setNuevoPresupuestoAbierto(true)}>
                      <DocumentText className="size-3.5" /> Nuevo presupuesto
                    </Button>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Pedidos de piezas ({detalle.pedidos.length})</p>
                    {detalle.pedidos.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin pedidos.</p>
                    )}
                    <div className="space-y-1.5">
                      {detalle.pedidos.map((pd) => (
                        <div key={pd.pedidoId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <span>{pd.numeroPedido || pd.pedidoId}</span>
                          <span className="text-xs text-muted-foreground">{formatearFecha(pd.fechaPedido)}</span>
                          <Badge variant="outline">{pd.estado}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="observaciones" className="space-y-3 pt-3">
                  <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-2.5 text-sm">
                    {detalle.observaciones || "Sin observaciones registradas."}
                  </p>
                  <div className="space-y-2">
                    <Textarea
                      rows={2}
                      placeholder="Añadir una observación..."
                      value={nuevaObservacion}
                      onChange={(e) => setNuevaObservacion(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={enviandoObservacion || !nuevaObservacion.trim()}
                      onClick={enviarObservacion}
                    >
                      <Send2 className="size-3.5" /> {enviandoObservacion ? "Enviando..." : "Añadir observación"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="historial" className="pt-3">
                  {detalle.historialEventos.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
                  )}
                  <ol className="space-y-2 border-l pl-3">
                    {detalle.historialEventos.map((ev) => (
                      <li key={ev.eventoId} className="relative">
                        <span className="absolute -left-4.75 top-1 size-2 rounded-full bg-primary" />
                        <p className="text-xs text-muted-foreground">{formatearFecha(ev.fechaHora)} · {ev.tipo}</p>
                        <p className="text-sm">{ev.descripcion}</p>
                      </li>
                    ))}
                  </ol>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </DialogContent>

      {detalle && (
        <>
          <FinalizarReparacionDialog
            detalle={detalle}
            open={finalizarAbierto}
            onOpenChange={setFinalizarAbierto}
            onFinalizada={cargarDetalle}
          />
          <MarcarEntregadoDialog
            resguardo={detalle.resguardo}
            open={entregaAbierta}
            onOpenChange={setEntregaAbierta}
            onEntregado={cargarDetalle}
          />
          <PresupuestoFormDialog
            resguardo={detalle.resguardo}
            presupuestoExistente={null}
            open={nuevoPresupuestoAbierto}
            onOpenChange={setNuevoPresupuestoAbierto}
            onGuardado={cargarDetalle}
          />
          <QrRecogidaDialog resguardo={detalle.resguardo} open={qrAbierto} onOpenChange={setQrAbierto} />
        </>
      )}
    </Dialog>
  );
}
