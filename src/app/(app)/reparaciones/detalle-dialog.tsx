"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Setting2,
  Send2,
  DocumentText,
  Box,
  Printer,
  CloseCircle,
  Receipt,
  ShieldTick,
  TickCircle,
  Warning2,
  Profile2User,
  Hashtag,
  Calendar,
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { COLOR_ESTADO } from "@/lib/reparaciones";
import { formatearFecha } from "@/lib/dias-entrega";
import { separarSintoma } from "@/lib/progreso-reparacion";
import { ReparacionDetalle, type Pedido } from "@/lib/reparacion-detalle";
import { m, lista as listaAnim, elementoLista, entrada, ProveedorAnimacion } from "@/lib/animacion";
import { LogisticaPanel } from "./logistica-panel";
import { FinalizarReparacionDialog, ConfirmarEntregaLocalDialog } from "./finalizar-dialog";
import { EntregarConFacturaDialog } from "./entregar-con-factura-dialog";
import { AnticipoDialog } from "./anticipo-dialog";
import { FacturaReparacionDialog } from "./factura-reparacion-dialog";
import { EstadosEspecialesPanel } from "./estados-especiales-panel";
import { PresupuestoCard } from "./presupuesto-card";
import { PresupuestosEnvioBar } from "./presupuestos-envio-bar";
import { PresupuestoFormDialog } from "./presupuesto-form-dialog";
import { QrRecogidaDialog } from "./qr-recogida-dialog";
import { ProgresoTimeline } from "./progreso-timeline";
import { AccionRequerida } from "./accion-requerida";
import { derivarEventoHistorial } from "./historial-evento";
import { MarcarGarantiaBoton } from "./marcar-garantia-boton";
import { FacturaRevisionBoton } from "./factura-revision-boton";
import { IniciarReparacionDialog } from "./iniciar-reparacion-dialog";
import { RegistrarPedidoDialog } from "./registrar-pedido-dialog";
import { RecepcionPedidosDialog } from "./recepcion-pedidos-dialog";
import { GestionPresupuestosDialog } from "./gestion-presupuestos-dialog";
import { ClienteEditable, EquipoEditable } from "./cliente-equipo-editable";

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

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}:</span> {valor || "-"}
    </p>
  );
}

// Mismos colores que el mapa colorPedido de renderizarInfoDetallada().
const ESTILO_PEDIDO: Record<string, string> = {
  Recibido: "border-emerald-500/40 bg-emerald-500/5",
  Pedido: "border-sky-500/40 bg-sky-500/5",
  "En Tránsito": "border-amber-500/40 bg-amber-500/5",
  Problema: "border-destructive/40 bg-destructive/5",
  "Pieza Rota": "border-destructive/40 bg-destructive/5",
  "Pieza Defectuosa": "border-amber-500/40 bg-amber-500/5",
};

const ESTILO_BADGE_PEDIDO: Record<string, string> = {
  Recibido: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  Pedido: "border-sky-500/40 text-sky-700 dark:text-sky-400",
  "En Tránsito": "border-amber-500/40 text-amber-700 dark:text-amber-400",
  Problema: "border-destructive/40 text-destructive",
  "Pieza Rota": "border-destructive/40 text-destructive",
  "Pieza Defectuosa": "border-amber-500/40 text-amber-700 dark:text-amber-400",
};

/** Fila etiqueta/valor de las tablas del original (`table table-sm`). */
function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 px-3 py-2">
      <dt className="text-sm font-medium text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 text-sm wrap-break-word">
        {typeof valor === "string" ? valor || "-" : valor}
      </dd>
    </div>
  );
}

/**
 * Estado de la factura, con las tres ramas del original: número (enlazado
 * al PDF si lo hay), "Pendiente" cuando se espera una y raya cuando no
 * corresponde. Las reparaciones en garantía nunca la requieren.
 */
function EstadoFactura({ detalle }: { detalle: ReparacionDetalle }) {
  if (detalle.numeroFactura) {
    const contenido = (
      <>
        <Receipt className="size-3.5" /> {detalle.numeroFactura}
      </>
    );
    const clase =
      "inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white";
    return detalle.urlFactura ? (
      <a href={detalle.urlFactura} target="_blank" rel="noopener noreferrer" className={`${clase} hover:bg-emerald-700`}>
        {contenido}
      </a>
    ) : (
      <span className={clase}>{contenido}</span>
    );
  }

  const requiereFactura =
    detalle.tipoIngreso !== "GARANTIA" &&
    (detalle.estado === "Reparado" || detalle.estado === "Presupuesto Aceptado");

  if (!requiereFactura) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-xs font-medium text-amber-950">
      <Warning2 className="size-3.5" /> Pendiente
    </span>
  );
}

/** Tarjeta de pedido con los mismos campos e iconos que el original. */
function PedidoCard({ pedido: pd }: { pedido: Pedido }) {
  return (
    <m.div
      variants={elementoLista}
      className={`space-y-1 rounded-xl border p-2.5 text-sm ${ESTILO_PEDIDO[pd.estado] ?? ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">{pd.pedidoId || "-"}</span>
        {pd.compradoPor && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Profile2User className="size-3.5" /> {pd.compradoPor}
          </span>
        )}
        <Badge variant="outline" className={`ml-auto ${ESTILO_BADGE_PEDIDO[pd.estado] ?? ""}`}>
          {pd.estado || "Sin estado"}
        </Badge>
      </div>
      {pd.notas && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Box className="size-3.5 shrink-0" /> {pd.notas}
        </p>
      )}
      {pd.numeroPedido && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Hashtag className="size-3.5 shrink-0" /> <span className="tabular-nums">{pd.numeroPedido}</span>
        </p>
      )}
      {pd.fechaEstimada && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" /> Est: {formatearFecha(pd.fechaEstimada)}
        </p>
      )}
      {pd.fechaRecepcion && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          <TickCircle className="size-3.5 shrink-0" /> Recibido: {formatearFecha(pd.fechaRecepcion)}
        </p>
      )}
    </m.div>
  );
}

/** Cabecera de sección con contador y, opcionalmente, su acción a la derecha. */
function Seccion({
  icono: Icono,
  titulo,
  cuenta,
  accion,
  children,
}: {
  icono: Icon;
  titulo: string;
  cuenta: number;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icono className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">{titulo}</h4>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {cuenta}
        </span>
        {accion && <div className="ml-auto">{accion}</div>}
      </div>
      {children}
    </section>
  );
}

function Vacio({ icono: Icono, texto }: { icono: Icon; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed py-6 text-center">
      <Icono className="size-5 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

export function DetalleReparacionDialog({
  resguardo,
  onOpenChange,
  onActualizado,
}: {
  resguardo: string | null;
  onOpenChange: (open: boolean) => void;
  /** Se llama además de refrescar el propio modal — para que la tabla y el
      Dashboard de la página no queden con el estado antiguo hasta que el
      usuario refresque manualmente después de cualquier acción de aquí. */
  onActualizado?: () => void;
}) {
  const [detalle, setDetalle] = useState<ReparacionDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [enviandoObservacion, setEnviandoObservacion] = useState(false);
  const confirmar = useConfirm();
  const [finalizarAbierto, setFinalizarAbierto] = useState(false);
  const [entregaAbierta, setEntregaAbierta] = useState(false);
  const [entregaLocalAbierta, setEntregaLocalAbierta] = useState(false);
  const [nuevoPresupuestoAbierto, setNuevoPresupuestoAbierto] = useState(false);
  const [qrAbierto, setQrAbierto] = useState(false);
  const [iniciarReparacionAbierto, setIniciarReparacionAbierto] = useState(false);
  const [registrarPedidoAbierto, setRegistrarPedidoAbierto] = useState(false);
  const [gestionPptosAbierto, setGestionPptosAbierto] = useState(false);
  const [facturaAbierta, setFacturaAbierta] = useState(false);
  const [facturarMensajeriaAbierto, setFacturarMensajeriaAbierto] = useState(false);
  const [anticipoAbierto, setAnticipoAbierto] = useState(false);
  const [editarPedidoAbierto, setEditarPedidoAbierto] = useState(false);
  const [recepcionAbierta, setRecepcionAbierta] = useState(false);

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

  // Callback compuesto: cualquier acción de este modal refresca su propio
  // detalle Y avisa a la página (tabla + Dashboard), no solo lo primero.
  function actualizarTodo() {
    cargarDetalle();
    onActualizado?.();
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

  // Reproduce enviarAPuntoLimpio() — sin datos propios, a diferencia de
  // marcar_entregado, así que no necesita un diálogo con formulario.
  async function enviarPuntoLimpio() {
    if (!resguardo) return;
    const ok = await confirmar("¿Confirma que desea enviar este equipo a punto limpio (reciclaje)?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "punto_limpio" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Equipo enviado a punto limpio (${data.diasTotales} días)`);
      actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  // Reproduce solicitarPresupuestoDesdeGarantia() — el escape del estado
  // "Garantía" cuando el equipo resulta NO estar cubierto.
  async function noCubiertoPorGarantia() {
    if (!resguardo) return;
    const ok = await confirmar("¿El equipo NO está cubierto por garantía?\n\nSe cambiará el estado a 'Presupuesto Pendiente' para elaborar presupuesto.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/solicitar-presupuesto`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Estado cambiado a Presupuesto Pendiente");
      actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function cambiarEstadoPedidos(pedidoIds: string[], estado: string) {
    const res = await fetch("/api/pedidos/cambiar-estado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedidos: pedidoIds, estado }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error desconocido");
  }

  // Reproduce marcarPiezaEnTransito() — confirmación simple, sin formulario.
  async function marcarEnTransito() {
    if (!detalle) return;
    const ok = await confirmar("¿Marcar pieza como En Tránsito?");
    if (!ok) return;
    const pedidoIds = detalle.pedidos.filter((p) => p.estado === "Pedido").map((p) => p.pedidoId);
    if (pedidoIds.length === 0) return;
    try {
      await cambiarEstadoPedidos(pedidoIds, "En Tránsito");
      toast.success("Pieza marcada como En Tránsito");
      actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  // Reproduce marcarPiezaRecibida(): confirmación directa si solo hay un
  // pedido pendiente; si hay varios, abre el selector con checkboxes.
  async function marcarPiezaRecibida() {
    if (!detalle) return;
    const pendientes = detalle.pedidos.filter((p) => p.estado === "Pedido" || p.estado === "En Tránsito");
    if (pendientes.length === 0) {
      toast.info("No hay pedidos pendientes de recibir");
      return;
    }
    if (pendientes.length > 1) {
      setRecepcionAbierta(true);
      return;
    }
    const p = pendientes[0];
    const desc = p.notas || "Sin descripción";
    const ok = await confirmar(`¿Confirma que la pieza ha sido recibida?\n\n• ${desc}${p.numeroPedido ? " — N° " + p.numeroPedido : ""}`);
    if (!ok) return;
    try {
      await cambiarEstadoPedidos([p.pedidoId], "Recibido");
      toast.success("Pieza marcada como recibida");
      actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  // Reproduce marcarEquipoRecibido() — el cliente trajo de vuelta el
  // equipo que se había llevado mientras llegaba la pieza.
  async function marcarEquipoRecibido() {
    if (!resguardo) return;
    const ok = await confirmar("¿El cliente trajo el equipo al local?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/logistica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "equipo_recibido" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Equipo recibido en el local");
      actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const sintoma = detalle ? separarSintoma(detalle.equipo.sintoma) : null;
  // Los cancelados no se listan, igual que en renderizarInfoDetallada().
  const pedidosVisibles = (detalle?.pedidos ?? []).filter((p) => p.estado !== "Cancelado");

  return (
    <Dialog open={resguardo !== null} onOpenChange={onOpenChange}>
      {/* p-0 / gap-0: la cabecera va a sangre y el cuerpo pone su propio
          padding, para poder pintar la barra de color de lado a lado. */}
      <DialogContent
        className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl print:static print:max-h-none print:max-w-none print:translate-none print:overflow-visible print:shadow-none print:ring-0"
        showCloseButton={false}
      >
        {/* El proveedor va aquí y no en el layout: así el motor de animación
            solo se descarga cuando se abre una reparación. */}
        <ProveedorAnimacion>
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
            // El detalle llega por fetch, así que aparece de golpe sobre el
            // esqueleto; una entrada corta suaviza ese salto.
            <m.div
              className="space-y-4"
              variants={listaAnim}
              initial="inicial"
              animate="visible"
            >
              <m.div variants={entrada}>
                <LogisticaPanel
                  detalle={detalle}
                  onActualizado={actualizarTodo}
                  onClienteSeLleva={() => setAnticipoAbierto(true)}
                  onClienteLoTrajo={marcarEquipoRecibido}
                />
              </m.div>

              <m.section variants={entrada} className="rounded-xl border bg-card p-4">
                <div className="grid gap-5 sm:grid-cols-2">
                  <ClienteEditable detalle={detalle} onActualizado={actualizarTodo} />
                  <EquipoEditable detalle={detalle} sintoma={sintoma} onActualizado={actualizarTodo} />
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
                  <MarcarGarantiaBoton detalle={detalle} onActualizado={actualizarTodo} />
                  <FacturaRevisionBoton detalle={detalle} onActualizado={actualizarTodo} />
                  <EstadosEspecialesPanel detalle={detalle} onActualizado={actualizarTodo} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t pt-3 sm:grid-cols-4">
                  <Dato label="Fecha entrega" valor={formatearFecha(detalle.fechaEntrega)} />
                  <Dato label="Estado entrega" valor={detalle.estadoEntrega} />
                  <Dato label="Nº factura" valor={detalle.numeroFactura} />
                  <Dato label="Recepción en local" valor={detalle.equipoEnLocal} />
                </div>
              </m.section>

              <m.div variants={entrada}>
                <ProgresoTimeline detalle={detalle} />
              </m.div>

              <m.div variants={entrada}>
                <AccionRequerida
                detalle={detalle}
                callbacks={{
                  onGestionarPresupuestos: () => setGestionPptosAbierto(true),
                  onFinalizar: () => setFinalizarAbierto(true),
                  onMarcarEntregado: () => setEntregaAbierta(true),
                  onEntregadoLocal: () => setEntregaLocalAbierta(true),
                  onFacturarMensajeria: () => setFacturarMensajeriaAbierto(true),
                  onNoCubiertoPorGarantia: noCubiertoPorGarantia,
                  onClienteSeLlevaAnticipo: () => setAnticipoAbierto(true),
                  onVerQr: () => setQrAbierto(true),
                  onIniciarReparacion: () => setIniciarReparacionAbierto(true),
                  onRegistrarPedido: () => setRegistrarPedidoAbierto(true),
                  onMarcarEnTransito: marcarEnTransito,
                  onMarcarPiezaRecibida: marcarPiezaRecibida,
                  onEditarPedido: () => setEditarPedidoAbierto(true),
                  onMarcarEquipoRecibido: marcarEquipoRecibido,
                  onEnviarPuntoLimpio: enviarPuntoLimpio,
                  onFacturacion: () => setFacturaAbierta(true),
                  }}
                />
              </m.div>

              <m.div variants={entrada}>
                <Tabs defaultValue="informacion">
                <TabsList>
                  <TabsTrigger value="informacion">Información</TabsTrigger>
                  <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
                  <TabsTrigger value="historial">Historial</TabsTrigger>
                </TabsList>

                {/* Dos columnas como renderizarInfoDetallada(): a la izquierda
                    los datos de recepción, a la derecha presupuestos, pedidos
                    y reparación. El contenedor lleva @container para que las
                    columnas colapsen por su propio ancho y no por el de la
                    ventana — dentro de un diálogo no son lo mismo. */}
                <TabsContent value="informacion" className="@container pt-4">
                  <div className="grid gap-6 @2xl:grid-cols-2">
                    <section>
                      <h4 className="mb-2 text-sm font-semibold text-primary">Datos de Recepción</h4>
                      <dl className="divide-y rounded-xl border">
                        <FilaDato etiqueta="Resguardo" valor={detalle.resguardo} />
                        <FilaDato etiqueta="Fecha Recepción" valor={formatearFecha(detalle.fechaRecepcion)} />
                        <FilaDato etiqueta="Cliente" valor={detalle.cliente.nombre} />
                        <FilaDato etiqueta="Teléfono" valor={detalle.cliente.telefono} />
                        <FilaDato etiqueta="Email" valor={detalle.cliente.email} />
                        <FilaDato etiqueta="Equipo" valor={detalle.equipo.modelo} />
                        <FilaDato etiqueta="Síntoma" valor={detalle.equipo.sintoma} />
                        <FilaDato etiqueta="Factura" valor={<EstadoFactura detalle={detalle} />} />
                      </dl>
                    </section>

                    <div className="space-y-5">
                      <Seccion
                        icono={Receipt}
                        titulo="Presupuestos"
                        cuenta={detalle.presupuestos.length}
                        accion={
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5"
                            onClick={() => setNuevoPresupuestoAbierto(true)}
                          >
                            <DocumentText className="size-3.5" /> Nuevo
                          </Button>
                        }
                      >
                        {detalle.presupuestos.length === 0 ? (
                          <Vacio icono={Receipt} texto="Todavía no hay ningún presupuesto." />
                        ) : (
                          <m.div className="space-y-2" variants={listaAnim} initial="inicial" animate="visible">
                            {detalle.presupuestos.map((p) => (
                              <PresupuestoCard
                                key={p.presupuestoId}
                                resguardo={detalle.resguardo}
                                presupuesto={p}
                                revisionPagada={detalle.revisionPagada === "SI"}
                                onActualizado={actualizarTodo}
                              />
                            ))}
                          </m.div>
                        )}
                        <PresupuestosEnvioBar
                          resguardo={detalle.resguardo}
                          presupuestos={detalle.presupuestos}
                          clienteTelefono={detalle.cliente.telefono}
                          onActualizado={actualizarTodo}
                        />
                      </Seccion>

                      <Seccion icono={Box} titulo="Pedidos" cuenta={pedidosVisibles.length}>
                        {pedidosVisibles.length === 0 ? (
                          <Vacio icono={Box} texto="No se ha pedido ninguna pieza." />
                        ) : (
                          <m.div className="space-y-2" variants={listaAnim} initial="inicial" animate="visible">
                            {pedidosVisibles.map((pd) => (
                              <PedidoCard key={pd.pedidoId} pedido={pd} />
                            ))}
                          </m.div>
                        )}
                      </Seccion>

                      {(detalle.tecnicoAsignado || detalle.fechaReparacion) && (
                        <section>
                          <h4 className="mb-2 text-sm font-semibold text-primary">Reparación</h4>
                          <dl className="divide-y rounded-xl border">
                            <FilaDato etiqueta="Técnico" valor={detalle.tecnicoAsignado} />
                            <FilaDato
                              etiqueta="Fecha Reparación"
                              valor={formatearFecha(detalle.fechaReparacion)}
                            />
                          </dl>
                        </section>
                      )}
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
                  <ol>
                    {detalle.historialEventos.map((ev, i) => {
                      const meta = derivarEventoHistorial(ev.tipo);
                      const Icono = meta.icon;
                      const esUltimo = i === detalle.historialEventos.length - 1;
                      return (
                        <li key={ev.eventoId} className="relative flex gap-3">
                          {!esUltimo && <span className="absolute top-8 bottom-0 left-3.75 w-px bg-border" />}
                          <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${meta.clase}`}>
                            <Icono className="size-4" />
                          </span>
                          <div className={`min-w-0 flex-1 pt-1 ${esUltimo ? "pb-0" : "pb-5"}`}>
                            <p className="text-sm text-foreground">{ev.descripcion}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatearFecha(ev.fechaHora)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </TabsContent>
                </Tabs>
              </m.div>
            </m.div>
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
        </ProveedorAnimacion>
      </DialogContent>

      {detalle && (
        <>
          <FinalizarReparacionDialog
            detalle={detalle}
            open={finalizarAbierto}
            onOpenChange={setFinalizarAbierto}
            onFinalizada={actualizarTodo}
          />
          <EntregarConFacturaDialog
            detalle={detalle}
            tipoEntrega="ENTREGADO"
            open={entregaAbierta}
            onOpenChange={setEntregaAbierta}
            onCompletado={actualizarTodo}
          />
          <EntregarConFacturaDialog
            detalle={detalle}
            tipoEntrega="ENVIO"
            open={facturarMensajeriaAbierto}
            onOpenChange={setFacturarMensajeriaAbierto}
            onCompletado={actualizarTodo}
          />
          <ConfirmarEntregaLocalDialog
            resguardo={detalle.resguardo}
            open={entregaLocalAbierta}
            onOpenChange={setEntregaLocalAbierta}
            onEntregado={actualizarTodo}
          />
          <AnticipoDialog
            detalle={detalle}
            open={anticipoAbierto}
            onOpenChange={setAnticipoAbierto}
            onCompletado={actualizarTodo}
          />
          <FacturaReparacionDialog
            detalle={detalle}
            open={facturaAbierta}
            onOpenChange={setFacturaAbierta}
            onGenerada={actualizarTodo}
          />
          <PresupuestoFormDialog
            resguardo={detalle.resguardo}
            presupuestoExistente={null}
            revisionPagada={detalle.revisionPagada === "SI"}
            open={nuevoPresupuestoAbierto}
            onOpenChange={setNuevoPresupuestoAbierto}
            onGuardado={actualizarTodo}
          />
          <QrRecogidaDialog resguardo={detalle.resguardo} open={qrAbierto} onOpenChange={setQrAbierto} />
          <IniciarReparacionDialog
            resguardo={detalle.resguardo}
            open={iniciarReparacionAbierto}
            onOpenChange={setIniciarReparacionAbierto}
            onIniciado={actualizarTodo}
          />
          <RegistrarPedidoDialog
            detalle={detalle}
            open={registrarPedidoAbierto}
            onOpenChange={setRegistrarPedidoAbierto}
            onRegistrado={actualizarTodo}
          />
          <RegistrarPedidoDialog
            detalle={detalle}
            modo="editar"
            open={editarPedidoAbierto}
            onOpenChange={setEditarPedidoAbierto}
            onRegistrado={actualizarTodo}
          />
          <RecepcionPedidosDialog
            pendientes={detalle.pedidos.filter((p) => p.estado === "Pedido" || p.estado === "En Tránsito")}
            open={recepcionAbierta}
            onOpenChange={setRecepcionAbierta}
            onRecibidos={actualizarTodo}
          />
          <GestionPresupuestosDialog
            detalle={detalle}
            open={gestionPptosAbierto}
            onOpenChange={setGestionPptosAbierto}
            onActualizado={actualizarTodo}
          />
        </>
      )}
    </Dialog>
  );
}
