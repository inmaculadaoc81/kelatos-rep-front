"use client";

import { useEffect, useState } from "react";
import {
  Setting2,
  Send2,
  DocumentText,
  Personalcard,
  Call,
  Sms,
  Location,
  Box,
  Printer,
  CloseCircle,
  Receipt,
  Clock,
  ShieldTick,
  TickCircle,
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { COLOR_ESTADO } from "@/lib/reparaciones";
import { formatearFecha } from "@/lib/dias-entrega";
import { separarSintoma } from "@/lib/progreso-reparacion";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { LogisticaPanel } from "./logistica-panel";
import { FinalizarReparacionDialog, MarcarEntregadoDialog } from "./finalizar-dialog";
import { EstadosEspecialesPanel } from "./estados-especiales-panel";
import { PresupuestoCard } from "./presupuesto-card";
import { PresupuestoFormDialog } from "./presupuesto-form-dialog";
import { QrRecogidaDialog } from "./qr-recogida-dialog";
import { ProgresoTimeline } from "./progreso-timeline";
import { AccionRequerida } from "./accion-requerida";

function EstadoBadge({ estado }: { estado: string }) {
  const color = COLOR_ESTADO[estado];
  if (!color) return <Badge variant="secondary">{estado}</Badge>;
  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {estado}
    </span>
  );
}

/** Línea de dato con icono, como las del panel de cliente del sistema original. */
function Linea({ icono: Icono, valor }: { icono: Icon; valor: string }) {
  if (!valor) return null;
  return (
    <p className="flex items-start gap-2 text-sm">
      <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="wrap-break-word">{valor}</span>
    </p>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}:</span> {valor || "-"}
    </p>
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

  const sintoma = detalle ? separarSintoma(detalle.equipo.sintoma) : null;

  return (
    <Dialog open={resguardo !== null} onOpenChange={onOpenChange}>
      {/* p-0 / gap-0: la cabecera va a sangre y el cuerpo pone su propio
          padding, para poder pintar la barra de color de lado a lado. */}
      <DialogContent
        className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl print:static print:max-h-none print:max-w-none print:translate-none print:overflow-visible print:shadow-none print:ring-0"
        showCloseButton={false}
      >
        <header className="flex items-center gap-3 bg-primary px-5 py-3.5 text-primary-foreground">
          <Setting2 className="size-5 shrink-0" variant="Bold" />
          <DialogTitle className="text-lg font-semibold tabular-nums">{resguardo}</DialogTitle>
          {detalle && (
            <>
              <EstadoBadge estado={detalle.estado} />
              {detalle.revisionPagada === "SI" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white">
                  <TickCircle className="size-3.5" variant="Bold" /> Revisión pagada
                </span>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="no-imprimir ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
          >
            <CloseCircle className="size-5" />
          </Button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 print:overflow-visible">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Error al cargar el detalle: {error}
            </div>
          )}

          {!detalle && !error && (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {detalle && sintoma && (
            <>
              <LogisticaPanel detalle={detalle} onActualizado={cargarDetalle} />

              <section className="rounded-xl border bg-card p-4">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Cliente
                    </h3>
                    <p className="text-base font-semibold">{detalle.cliente.nombre || "-"}</p>
                    <Linea icono={Personalcard} valor={detalle.dniCif} />
                    <Linea icono={Call} valor={detalle.cliente.telefono} />
                    <Linea icono={Sms} valor={detalle.cliente.email} />
                    <Linea icono={Location} valor={detalle.cliente.direccion} />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Equipo
                    </h3>
                    <p className="text-base font-semibold">{detalle.equipo.modelo || "-"}</p>
                    <Dato label="Síntoma" valor={sintoma.principal} />
                    {sintoma.extras.length > 0 && (
                      <div className="space-y-0.5">
                        {sintoma.extras.map((linea, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {linea}
                          </p>
                        ))}
                      </div>
                    )}
                    <Dato label="Técnico asignado" valor={detalle.tecnicoAsignado} />
                    <Dato label="Fecha recepción" valor={formatearFecha(detalle.fechaRecepcion)} />
                  </div>
                </div>

                <hr className="my-4" />

                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Estado actual
                  </h3>
                  <EstadoBadge estado={detalle.estado} />
                  {detalle.estado === "Garantía" && (
                    <Badge variant="outline" className="gap-1">
                      <ShieldTick className="size-3.5" /> Garantía
                    </Badge>
                  )}
                  <EstadosEspecialesPanel detalle={detalle} onActualizado={cargarDetalle} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t pt-3 sm:grid-cols-4">
                  <Dato label="Fecha entrega" valor={formatearFecha(detalle.fechaEntrega)} />
                  <Dato label="Estado entrega" valor={detalle.estadoEntrega} />
                  <Dato label="Nº factura" valor={detalle.numeroFactura} />
                  <Dato label="Recepción en local" valor={detalle.equipoEnLocal} />
                </div>
              </section>

              <ProgresoTimeline detalle={detalle} />

              <AccionRequerida
                detalle={detalle}
                callbacks={{
                  onNuevoPresupuesto: () => setNuevoPresupuestoAbierto(true),
                  onFinalizar: () => setFinalizarAbierto(true),
                  onMarcarEntregado: () => setEntregaAbierta(true),
                  onVerQr: () => setQrAbierto(true),
                }}
              />

              <Tabs defaultValue="informacion">
                <TabsList>
                  <TabsTrigger value="informacion">Información</TabsTrigger>
                  <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
                  <TabsTrigger value="historial">Historial</TabsTrigger>
                </TabsList>

                <TabsContent value="informacion" className="space-y-4 pt-3">
                  <div>
                    <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <Receipt className="size-4 text-muted-foreground" />
                      Presupuestos ({detalle.presupuestos.length})
                    </h4>
                    {detalle.presupuestos.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin presupuestos.</p>
                    )}
                    <div className="space-y-2">
                      {detalle.presupuestos.map((p) => (
                        <PresupuestoCard
                          key={p.presupuestoId}
                          resguardo={detalle.resguardo}
                          presupuesto={p}
                          onActualizado={cargarDetalle}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 gap-1.5"
                      onClick={() => setNuevoPresupuestoAbierto(true)}
                    >
                      <DocumentText className="size-3.5" /> Nuevo presupuesto
                    </Button>
                  </div>

                  <div>
                    <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <Box className="size-4 text-muted-foreground" />
                      Pedidos de piezas ({detalle.pedidos.length})
                    </h4>
                    {detalle.pedidos.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin pedidos.</p>
                    )}
                    <div className="space-y-1.5">
                      {detalle.pedidos.map((pd) => (
                        <div
                          key={pd.pedidoId}
                          className="flex items-center justify-between rounded-md border p-2 text-sm"
                        >
                          <span>{pd.numeroPedido || pd.pedidoId}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatearFecha(pd.fechaPedido)}
                          </span>
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
                      <Send2 className="size-3.5" />{" "}
                      {enviandoObservacion ? "Enviando..." : "Añadir observación"}
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
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatearFecha(ev.fechaHora)} · {ev.tipo}
                        </p>
                        <p className="text-sm">{ev.descripcion}</p>
                      </li>
                    ))}
                  </ol>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        <footer className="no-imprimir flex justify-end gap-2 border-t bg-muted/50 px-5 py-3">
          <Button variant="outline" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimir resguardo
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </footer>
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
