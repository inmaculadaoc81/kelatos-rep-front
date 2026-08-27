"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, CloseCircle, Edit2, Truck, TickCircle, Trash, Add, DocumentText, Ticket } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { EliminarRegistroDialog } from "@/components/eliminar-registro-dialog";
import { useEsSuperadmin } from "@/hooks/use-es-superadmin";
import { formatearFecha } from "@/lib/dias-entrega";
import {
  Venta,
  ItemVenta,
  estadoVentaMostrado,
  ESTILO_ESTADO_ITEM_VENTA,
} from "@/lib/ventas";
import type { Proveedor } from "@/app/api/proveedores/route";
import { esUrlValida } from "@/lib/validacion";
import { TicketManualDialog } from "../reparaciones/ticket-manual-dialog";
import { VentaTicketModalShell } from "./venta-ticket-modal-shell";

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// El campo "enlace" a veces guarda un código/referencia de pedido en vez de
// una URL real — un <a href> con eso parece un enlace pero no lleva a
// ningún sitio al pulsarlo, así que solo se muestra como link clicable
// cuando de verdad tiene forma de URL.
function EnlaceOTexto({ valor }: { valor: string }) {
  if (!valor) return <>-</>;
  if (esUrlValida(valor)) {
    return (
      <a href={valor} target="_blank" rel="noopener noreferrer" className="max-w-40 truncate text-primary hover:underline" title={valor}>
        Ver Enlace
      </a>
    );
  }
  return <span className="inline-block max-w-40 truncate align-bottom" title={valor}>{valor}</span>;
}

function EstadoBadge({ estado, estilo }: { estado: string; estilo: { bg: string; color?: string } }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: estilo.bg, color: estilo.color || "#fff" }}>
      {estado}
    </span>
  );
}

/**
 * Reproduce #modalDetalleVenta (abrirDetalleVenta/renderizarItemsDetalle/
 * _accionesItemVenta) — el modal principal de "Pedidos de piezas": cada
 * pieza puede editarse, pedirse a un proveedor, marcarse recibida o
 * eliminarse según su estado, y la venta se marca Entregada/Cancelada
 * desde aquí. El botón "Vista previa factura" del original abre el editor
 * de factura compartido con Facturas de Clientes (modalVistaFactura) —
 * no está replicado aquí, queda fuera de esta vista.
 */
export function DetalleVentaDialog({
  ventaId,
  open,
  onOpenChange,
  onActualizado,
}: {
  ventaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const confirmar = useConfirm();
  const esSuperadmin = useEsSuperadmin();
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [ticketAbierto, setTicketAbierto] = useState(false);
  const [ticketDetalleAbierto, setTicketDetalleAbierto] = useState(false);
  const [venta, setVenta] = useState<Venta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [itemEditando, setItemEditando] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editCosto, setEditCosto] = useState(0);
  const [editPrecio, setEditPrecio] = useState(0);

  const [itemPidiendo, setItemPidiendo] = useState<string | null>(null);
  const [pedProveedor, setPedProveedor] = useState("");
  const [pedNumero, setPedNumero] = useState("");
  const [pedFecha, setPedFecha] = useState("");
  const [pedEnlace, setPedEnlace] = useState("");

  const [agregando, setAgregando] = useState(false);
  const [nuevoDesc, setNuevoDesc] = useState("");
  const [nuevoCosto, setNuevoCosto] = useState(0);
  const [nuevoPrecio, setNuevoPrecio] = useState(0);
  const [nuevoProveedor, setNuevoProveedor] = useState("");
  const [nuevoEnlace, setNuevoEnlace] = useState("");

  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    if (!ventaId) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/ventas/${ventaId}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setVenta(data.venta as Venta);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar el pedido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (open && ventaId) {
      cargar();
      setItemEditando(null);
      setItemPidiendo(null);
      setAgregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ventaId]);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setProveedores(data.proveedores); })
      .catch(() => {});
  }, []);

  async function actualizarTodo() {
    await cargar();
    onActualizado();
  }

  if (!ventaId) return null;

  const finalizado = venta ? venta.estado === "Entregado" || venta.estado === "Cancelado" : false;
  const todasRecibidas = !!venta && venta.items.length > 0 && venta.items.every((i) => i.estadoPedido === "Pieza Recibida");
  const estadoInfo = venta ? estadoVentaMostrado(venta) : null;

  function abrirEditar(item: ItemVenta) {
    setItemPidiendo(null);
    setAgregando(false);
    setItemEditando(item.itemId);
    setEditDesc(item.descripcion);
    setEditCosto(item.costo);
    setEditPrecio(item.precio);
  }

  async function guardarEdicion() {
    if (!itemEditando) return;
    if (!editDesc.trim()) return toast.error("La descripción es obligatoria");
    if (editPrecio <= 0) return toast.error("El precio debe ser mayor a 0");
    setEnviando(true);
    try {
      const res = await fetch(`/api/items-venta/${itemEditando}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: editDesc.trim(), costo: editCosto, precio: editPrecio }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pieza actualizada");
      setItemEditando(null);
      await actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  function abrirPedir(item: ItemVenta) {
    setItemEditando(null);
    setAgregando(false);
    setItemPidiendo(item.itemId);
    setPedProveedor(item.proveedorId || "");
    setPedNumero("");
    setPedFecha("");
    setPedEnlace(item.enlace || "");
  }

  async function confirmarPedido() {
    if (!itemPidiendo) return;
    if (!pedProveedor) return toast.error("Selecciona un proveedor");
    if (!pedNumero.trim()) return toast.error("El Nº de pedido es obligatorio");
    if (!pedFecha) return toast.error("La fecha estimada es obligatoria");
    if (!pedEnlace.trim()) return toast.error("El enlace es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch(`/api/items-venta/${itemPidiendo}/registrar-pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedorId: pedProveedor, numeroPedido: pedNumero.trim(), fechaEstimada: pedFecha, enlace: pedEnlace.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pedido registrado");
      setItemPidiendo(null);
      await actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function marcarRecibido(itemId: string) {
    setEnviando(true);
    try {
      const res = await fetch(`/api/items-venta/${itemId}/recibir`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pieza marcada como recibida");
      await actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function eliminarItem(itemId: string) {
    const ok = await confirmar("¿Eliminar esta pieza de la venta?");
    if (!ok) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/items-venta/${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pieza eliminada");
      await actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  function abrirAgregar() {
    setItemEditando(null);
    setItemPidiendo(null);
    setAgregando(true);
    setNuevoDesc("");
    setNuevoCosto(0);
    setNuevoPrecio(0);
    setNuevoProveedor("");
    setNuevoEnlace("");
  }

  async function confirmarAgregar() {
    if (!venta) return;
    if (!nuevoDesc.trim()) return toast.error("La descripción es obligatoria");
    if (nuevoCosto <= 0) return toast.error("El costo es obligatorio");
    if (nuevoPrecio <= 0) return toast.error("El precio es obligatorio");
    if (!nuevoProveedor) return toast.error("El proveedor es obligatorio");
    if (!nuevoEnlace.trim()) return toast.error("El enlace es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch(`/api/ventas/${venta.ventaId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: nuevoDesc.trim(), costo: nuevoCosto, precio: nuevoPrecio, proveedorId: nuevoProveedor, enlace: nuevoEnlace.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pieza agregada");
      setAgregando(false);
      await actualizarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function marcarEntregada() {
    if (!venta) return;
    const ok = await confirmar("¿Marcar esta venta como entregada?");
    if (!ok) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/ventas/${venta.ventaId}/entregar`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Venta entregada");
      await actualizarTodo();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function cancelarVenta() {
    if (!venta) return;
    const ok = await confirmar("¿Cancelar esta venta?");
    if (!ok) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/ventas/${venta.ventaId}/cancelar`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Venta cancelada");
      await actualizarTodo();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto gap-0 p-0 sm:max-w-5xl" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
          <ShoppingCart className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Pedido #{ventaId}</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => onOpenChange(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        {cargando && !venta && <div className="p-6 text-center text-sm text-muted-foreground">Cargando…</div>}

        {venta && (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div><span className="font-semibold">Cliente:</span> {venta.clienteNombre || "-"}</div>
              <div><span className="font-semibold">Teléfono:</span> {venta.clienteTelefono || "-"}</div>
              <div><span className="font-semibold">Email:</span> {venta.clienteEmail || "-"}</div>
              <div><span className="font-semibold">Fecha:</span> {formatearFecha(venta.fecha)}</div>
              <div><span className="font-semibold">Entrega:</span> {venta.fechaEntrega ? formatearFecha(venta.fechaEntrega) : "-"}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1.5"><span className="font-semibold">Estado:</span> {estadoInfo && <EstadoBadge estado={estadoInfo.texto} estilo={estadoInfo.estilo} />}</div>
              <div><span className="font-semibold">Total:</span> <span className="font-bold">{euros(venta.items.reduce((s, i) => s + i.precio, 0))}</span></div>
              <div><span className="font-semibold">Ganancia:</span> <span className="font-bold text-emerald-700 dark:text-emerald-400">{euros(venta.items.reduce((s, i) => s + (i.precio - i.costo), 0))}</span></div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <div className="flex items-center gap-1.5">
                <DocumentText className="size-4 text-muted-foreground" />
                <span className="font-semibold">Factura:</span> {venta.numeroFactura || "-"}
              </div>
              <div className="flex items-center gap-1.5">
                <Ticket className="size-4 text-muted-foreground" />
                <span className="font-semibold">Ticket:</span>{" "}
                {venta.numeroTicket ? (
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setTicketDetalleAbierto(true)}>
                    {venta.numeroTicket}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-6 gap-1.5 px-2 text-xs" onClick={() => setTicketAbierto(true)}>
                    <Ticket className="size-3.5" /> Generar Ticket
                  </Button>
                )}
              </div>
            </div>

            {venta.observaciones && (
              <div className="text-sm"><span className="font-semibold">Observaciones:</span> {venta.observaciones}</div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Piezas</h3>
              {!finalizado && (
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={abrirAgregar} disabled={enviando}>
                  <Add className="size-3.5" /> Agregar Pieza
                </Button>
              )}
            </div>

            {agregando && (
              <div className="space-y-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
                <p className="text-xs font-semibold">Agregar Pieza</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input placeholder="Descripción *" className="col-span-2" value={nuevoDesc} onChange={(e) => setNuevoDesc(e.target.value)} />
                  <DecimalInput placeholder="Costo *" value={nuevoCosto} onChange={setNuevoCosto} />
                  <DecimalInput placeholder="Precio *" value={nuevoPrecio} onChange={setNuevoPrecio} />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Select value={nuevoProveedor} onValueChange={(v) => setNuevoProveedor(v || "")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Proveedor *" /></SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => <SelectItem key={p.proveedorId} value={p.proveedorId}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Enlace *" value={nuevoEnlace} onChange={(e) => setNuevoEnlace(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={confirmarAgregar} disabled={enviando}>
                    <Add className="size-3.5" /> Agregar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAgregando(false)} disabled={enviando}>Cancelar</Button>
                </div>
              </div>
            )}

            {itemEditando && (
              <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold">Editar pieza</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input placeholder="Descripción" className="col-span-2" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                  <DecimalInput placeholder="Costo" value={editCosto} onChange={setEditCosto} />
                  <DecimalInput placeholder="Precio" value={editPrecio} onChange={setEditPrecio} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={guardarEdicion} disabled={enviando}>Guardar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setItemEditando(null)} disabled={enviando}>Cancelar</Button>
                </div>
              </div>
            )}

            {itemPidiendo && (
              <div className="space-y-2 rounded-lg border border-sky-500/40 bg-sky-500/5 p-3">
                <p className="text-xs font-semibold">Registrar Pedido</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Select value={pedProveedor} onValueChange={(v) => setPedProveedor(v || "")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Proveedor *" /></SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => <SelectItem key={p.proveedorId} value={p.proveedorId}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Nº Pedido *" value={pedNumero} onChange={(e) => setPedNumero(e.target.value)} />
                  <Input type="date" placeholder="Fecha estimada *" min={new Date().toISOString().slice(0, 10)} value={pedFecha} onChange={(e) => setPedFecha(e.target.value)} />
                </div>
                <Input placeholder="Enlace *" value={pedEnlace} onChange={(e) => setPedEnlace(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700" onClick={confirmarPedido} disabled={enviando}>
                    <TickCircle className="size-3.5" /> Confirmar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setItemPidiendo(null)} disabled={enviando}>Cancelar</Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Fecha Pedido</TableHead>
                    <TableHead>Fecha Recibido</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                    <TableHead>Enlace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venta.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-4 text-center text-muted-foreground">Sin piezas</TableCell>
                    </TableRow>
                  )}
                  {venta.items.map((item) => {
                    const estilo = ESTILO_ESTADO_ITEM_VENTA[item.estadoPedido] || { bg: "#6c757d" };
                    return (
                      <TableRow key={item.itemId}>
                        <TableCell className="text-sm">{item.descripcion || "-"}</TableCell>
                        <TableCell className="text-sm">{euros(item.costo)}</TableCell>
                        <TableCell className="text-sm">{euros(item.precio)}</TableCell>
                        <TableCell className="text-sm">{item.proveedorNombre || "-"}</TableCell>
                        <TableCell className="text-sm">{item.numeroPedido || "-"}</TableCell>
                        <TableCell className="text-sm">{item.fechaPedido ? formatearFecha(item.fechaPedido) : "-"}</TableCell>
                        <TableCell className="text-sm">{item.fechaRecepcion ? formatearFecha(item.fechaRecepcion) : "-"}</TableCell>
                        <TableCell><EstadoBadge estado={item.estadoPedido || "Pieza Pendiente"} estilo={estilo} /></TableCell>
                        <TableCell className="whitespace-nowrap">
                          {!finalizado && item.estadoPedido === "Pieza Pendiente" && (
                            <>
                              <Button size="icon-sm" variant="outline" className="mr-1" title="Editar" onClick={() => abrirEditar(item)} disabled={enviando}>
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button size="icon-sm" variant="outline" className="mr-1 text-sky-600" title="Registrar pedido" onClick={() => abrirPedir(item)} disabled={enviando}>
                                <Truck className="size-3.5" />
                              </Button>
                              <Button size="icon-sm" variant="outline" className="text-destructive" title="Eliminar" onClick={() => eliminarItem(item.itemId)} disabled={enviando}>
                                <Trash className="size-3.5" />
                              </Button>
                            </>
                          )}
                          {!finalizado && item.estadoPedido === "En Tránsito" && (
                            <>
                              <Button size="icon-sm" variant="outline" className="mr-1" title="Editar" onClick={() => abrirEditar(item)} disabled={enviando}>
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button size="sm" className="h-7 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => marcarRecibido(item.itemId)} disabled={enviando}>
                                <TickCircle className="size-3.5" /> Marcar Recibido
                              </Button>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <EnlaceOTexto valor={item.enlace} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/50 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {venta && !finalizado && todasRecibidas && (
              <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400" onClick={marcarEntregada} disabled={enviando}>
                <TickCircle className="size-3.5" /> Marcar Entregada
              </Button>
            )}
            {venta && !finalizado && (
              <Button size="sm" variant="outline" className="gap-1.5 border-destructive text-destructive hover:bg-destructive/10" onClick={cancelarVenta} disabled={enviando}>
                <CloseCircle className="size-3.5" /> Cancelar Venta
              </Button>
            )}
            {venta && esSuperadmin && (
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setEliminarAbierto(true)} disabled={enviando}>
                <Trash className="size-3.5" /> Eliminar
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={enviando}>Cerrar</Button>
        </footer>
      </DialogContent>

      {venta && (
        <EliminarRegistroDialog
          tipo="venta"
          id={venta.ventaId}
          apiUrl={`/api/ventas/${venta.ventaId}`}
          open={eliminarAbierto}
          onOpenChange={setEliminarAbierto}
          onEliminado={() => { onOpenChange(false); onActualizado(); }}
        />
      )}

      {venta && (
        <TicketManualDialog
          open={ticketAbierto}
          onOpenChange={setTicketAbierto}
          ventaId={venta.ventaId}
          venta={venta}
          onGenerado={actualizarTodo}
        />
      )}

      {venta && venta.numeroTicket && (
        <VentaTicketModalShell
          venta={venta}
          open={ticketDetalleAbierto}
          onOpenChange={setTicketDetalleAbierto}
          onActualizado={actualizarTodo}
        />
      )}
    </Dialog>
  );
}
