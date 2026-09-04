"use client";

import { useEffect, useState } from "react";
import { Box, Clock, Link2, Truck, Trash, AddCircle, TickCircle } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { StockPieza, DatosStockPiezaForm, EnlaceCompra, PedidoStock } from "@/lib/stock-piezas";

function vacio(): DatosStockPiezaForm {
  return { referencia: "", nombre: "", descripcion: "", categoria: "", costeInterno: 0, precioCliente: 0, manoObra: 0, proveedor: "", stockDisponible: 0, stockMinimo: 0 };
}

function desdeExistente(p: StockPieza): DatosStockPiezaForm {
  return {
    referencia: p.referencia,
    nombre: p.nombre,
    descripcion: p.descripcion,
    categoria: p.categoria,
    costeInterno: p.costeInterno,
    precioCliente: p.precioCliente,
    manoObra: p.manoObra,
    proveedor: p.proveedor,
    stockDisponible: p.stockDisponible,
    stockMinimo: p.stockMinimo,
  };
}

function fechaCorta(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-ES");
}

/** Reproduce #modalStockPieza (Index.html): mismos campos, misma
    referencia-readOnly en edición, misma nota bajo "Mano de obra". */
export function PiezaStockFormDialog({
  piezaExistente,
  categorias,
  valoresIniciales,
  origenResguardo,
  open,
  onOpenChange,
  onGuardado,
}: {
  piezaExistente: StockPieza | null;
  categorias: string[];
  /** Precarga campos (p.ej. nombre) al abrir — usado desde Punto Limpio al registrar piezas de un reciclaje interno. */
  valoresIniciales?: Partial<DatosStockPiezaForm>;
  /** Resguardo de origen cuando la pieza procede de un reciclaje interno de Punto Limpio. */
  origenResguardo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosStockPiezaForm>(() => (piezaExistente ? desdeExistente(piezaExistente) : { ...vacio(), ...valoresIniciales }));
  const [enviando, setEnviando] = useState(false);
  const esEdicion = piezaExistente !== null;

  const [historial, setHistorial] = useState<{ id: number; fecha_hora: string; usuario: string | null; descripcion: string }[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Enlaces de compra y pedidos de reposición — petición del usuario,
  // 2026-09-04. Se cargan aparte del historial de cambios (misma pieza,
  // otro propósito): guardar dónde se compra cada pieza (varios enlaces
  // posibles) y registrar cuándo se pidió más stock y cuándo llegaría.
  const [enlaces, setEnlaces] = useState<EnlaceCompra[]>([]);
  const [pedidos, setPedidos] = useState<PedidoStock[]>([]);
  const [cargandoEnlaces, setCargandoEnlaces] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState("");
  const [nuevoCosto, setNuevoCosto] = useState("");
  const [nuevoEnlace, setNuevoEnlace] = useState("");
  const [agregandoEnlace, setAgregandoEnlace] = useState(false);
  const [pedirEnlace, setPedirEnlace] = useState<EnlaceCompra | null>(null);
  const [pedidoCantidad, setPedidoCantidad] = useState("1");
  const [pedidoFecha, setPedidoFecha] = useState("");
  const [registrandoPedido, setRegistrandoPedido] = useState(false);

  useEffect(() => {
    if (!open || !esEdicion || !piezaExistente) return;
    setCargandoHistorial(true);
    fetch(`/api/stock-piezas/${encodeURIComponent(piezaExistente.referencia)}/historial`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setHistorial(data.historial); })
      .finally(() => setCargandoHistorial(false));
  }, [open, esEdicion, piezaExistente]);

  function cargarEnlacesYPedidos(referencia: string) {
    setCargandoEnlaces(true);
    Promise.all([
      fetch(`/api/stock-piezas/${encodeURIComponent(referencia)}/enlaces`).then((r) => r.json()),
      fetch(`/api/stock-piezas/${encodeURIComponent(referencia)}/pedidos`).then((r) => r.json()),
    ])
      .then(([datosEnlaces, datosPedidos]) => {
        if (datosEnlaces.ok) setEnlaces(datosEnlaces.enlaces);
        if (datosPedidos.ok) setPedidos(datosPedidos.pedidos);
      })
      .finally(() => setCargandoEnlaces(false));
  }

  useEffect(() => {
    if (!open || !esEdicion || !piezaExistente) return;
    cargarEnlacesYPedidos(piezaExistente.referencia);
  }, [open, esEdicion, piezaExistente]);

  function actualizar<K extends keyof DatosStockPiezaForm>(campo: K, valor: DatosStockPiezaForm[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.referencia.trim()) return toast.error("La referencia es obligatoria");
    if (!datos.nombre.trim()) return toast.error("El nombre es obligatorio");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/stock-piezas/${encodeURIComponent(piezaExistente!.referencia)}` : "/api/stock-piezas";
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, referencia: datos.referencia.trim().toUpperCase(), origenResguardo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Pieza actualizada" : "Pieza creada");
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  async function agregarEnlace() {
    if (!piezaExistente) return;
    if (!nuevoEnlace.trim()) return toast.error("El enlace de compra es obligatorio");
    setAgregandoEnlace(true);
    try {
      const res = await fetch(`/api/stock-piezas/${encodeURIComponent(piezaExistente.referencia)}/enlaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedor: nuevoProveedor, costo: nuevoCosto ? Number(nuevoCosto) : null, enlace: nuevoEnlace }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Enlace agregado");
      setNuevoProveedor("");
      setNuevoCosto("");
      setNuevoEnlace("");
      cargarEnlacesYPedidos(piezaExistente.referencia);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setAgregandoEnlace(false);
    }
  }

  async function eliminarEnlace(id: number) {
    if (!piezaExistente) return;
    try {
      const res = await fetch(`/api/stock-piezas/enlaces/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEnlaces((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function confirmarPedido() {
    if (!piezaExistente || !pedirEnlace) return;
    const cantidad = Number.parseInt(pedidoCantidad, 10);
    if (!Number.isFinite(cantidad) || cantidad <= 0) return toast.error("La cantidad debe ser mayor que 0");
    setRegistrandoPedido(true);
    try {
      const res = await fetch(`/api/stock-piezas/${encodeURIComponent(piezaExistente.referencia)}/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enlaceId: pedirEnlace.id, cantidad, fechaEstimadaLlegada: pedidoFecha || null }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pedido registrado");
      setPedirEnlace(null);
      setPedidoCantidad("1");
      setPedidoFecha("");
      cargarEnlacesYPedidos(piezaExistente.referencia);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setRegistrandoPedido(false);
    }
  }

  async function marcarRecibido(id: number) {
    if (!piezaExistente) return;
    try {
      const res = await fetch(`/api/stock-piezas/pedidos/${id}/recibido`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pedido marcado como recibido — stock actualizado");
      cargarEnlacesYPedidos(piezaExistente.referencia);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  async function cancelarPedido(id: number) {
    if (!piezaExistente) return;
    try {
      const res = await fetch(`/api/stock-piezas/pedidos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      cargarEnlacesYPedidos(piezaExistente.referencia);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const pedidosPendientes = pedidos.filter((p) => p.estado === "pendiente");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (enviando) return;
        if (!o) setDatos(piezaExistente ? desdeExistente(piezaExistente) : { ...vacio(), ...valoresIniciales });
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl sm:max-w-xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="size-5" /> {esEdicion ? "Editar pieza" : "Nueva pieza"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="spReferencia">Referencia *</Label>
              <Input
                id="spReferencia"
                placeholder="Ej: TM-001"
                className="uppercase"
                value={datos.referencia}
                disabled={esEdicion}
                onChange={(e) => actualizar("referencia", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="spNombre">Nombre *</Label>
              <Input id="spNombre" placeholder="Ej: Cuchilla Thermomix" value={datos.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="spCategoria">Categoría</Label>
            <Input id="spCategoria" list="spCategoriasList" placeholder="Ej: Thermomix, Robots..." value={datos.categoria} onChange={(e) => actualizar("categoria", e.target.value)} />
            <datalist id="spCategoriasList">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="spDescripcion">Descripción / notas</Label>
            <Input id="spDescripcion" placeholder="Modelo compatible, observaciones..." value={datos.descripcion} onChange={(e) => actualizar("descripcion", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="spCoste">Coste interno (€)</Label>
              <Input id="spCoste" type="number" min={0} step="0.01" value={datos.costeInterno} onChange={(e) => actualizar("costeInterno", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spPrecio">Precio cliente (€)</Label>
              <Input id="spPrecio" type="number" min={0} step="0.01" value={datos.precioCliente} onChange={(e) => actualizar("precioCliente", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="spManoObra">Mano de obra (€)</Label>
              <Input id="spManoObra" type="number" min={0} step="0.01" value={datos.manoObra} onChange={(e) => actualizar("manoObra", parseFloat(e.target.value) || 0)} />
              <p className="text-[11px] text-muted-foreground">Se suma automáticamente al elegir la pieza en presupuestos/facturas.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="spProveedor">Proveedor</Label>
              <Input id="spProveedor" value={datos.proveedor} onChange={(e) => actualizar("proveedor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spStockDisp">Stock disponible</Label>
              <Input id="spStockDisp" type="number" min={0} step="1" value={datos.stockDisponible} onChange={(e) => actualizar("stockDisponible", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spStockMin">Stock mínimo (alerta)</Label>
              <Input id="spStockMin" type="number" min={0} step="1" value={datos.stockMinimo} onChange={(e) => actualizar("stockMinimo", parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {esEdicion && piezaExistente && (
            <div className="space-y-2 border-t pt-3">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="size-3.5" /> Enlaces de compra
              </Label>

              {cargandoEnlaces && <p className="text-xs text-muted-foreground">Cargando…</p>}

              {!cargandoEnlaces && enlaces.length > 0 && (
                <div className="space-y-1.5">
                  {enlaces.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-md border bg-muted/20 p-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{e.proveedor || "Sin proveedor"}</span>
                          {e.costo !== null && <span className="text-muted-foreground">{e.costo.toFixed(2)} €</span>}
                        </div>
                        <a href={e.enlace} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">
                          {e.enlace}
                        </a>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1" onClick={() => setPedirEnlace(e)}>
                        <Truck className="size-3.5" /> Pedir
                      </Button>
                      <button type="button" className="shrink-0 text-muted-foreground hover:text-destructive" title="Eliminar enlace" onClick={() => eliminarEnlace(e.id)}>
                        <Trash className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-1.5">
                <div className="w-28 space-y-1">
                  <Label className="text-[11px]">Proveedor</Label>
                  <Input className="h-8 text-xs" value={nuevoProveedor} onChange={(e) => setNuevoProveedor(e.target.value)} />
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-[11px]">Costo (€)</Label>
                  <Input className="h-8 text-xs" type="number" min={0} step="0.01" value={nuevoCosto} onChange={(e) => setNuevoCosto(e.target.value)} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-[11px]">Enlace *</Label>
                  <Input className="h-8 text-xs" placeholder="https://..." value={nuevoEnlace} onChange={(e) => setNuevoEnlace(e.target.value)} />
                </div>
                <Button size="icon-sm" className="h-8 w-8 shrink-0" onClick={agregarEnlace} disabled={agregandoEnlace} title="Agregar enlace">
                  <AddCircle className="size-4" />
                </Button>
              </div>

              {pedidosPendientes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] text-muted-foreground">Pedidos en camino</Label>
                  {pedidosPendientes.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs dark:bg-amber-500/10">
                      <span>
                        <strong>{p.cantidad}</strong> unidad(es){p.proveedor ? ` — ${p.proveedor}` : ""}
                        {p.fechaEstimadaLlegada ? ` · llega aprox. ${fechaCorta(p.fechaEstimadaLlegada)}` : ""}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px]" onClick={() => marcarRecibido(p.id)}>
                          <TickCircle className="size-3" /> Recibido
                        </Button>
                        <button type="button" className="text-muted-foreground hover:text-destructive" title="Cancelar pedido" onClick={() => cancelarPedido(p.id)}>
                          <Trash className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {esEdicion && (
            <div className="space-y-1.5 border-t pt-3">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Historial de cambios
              </Label>
              {cargandoHistorial && <p className="text-xs text-muted-foreground">Cargando…</p>}
              {!cargandoHistorial && historial.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin cambios registrados todavía.</p>
              )}
              {!cargandoHistorial && historial.length > 0 && (
                <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border bg-muted/30 p-2">
                  {historial.map((h) => (
                    <div key={h.id} className="text-xs">
                      <span className="text-muted-foreground">
                        {new Date(h.fecha_hora).toLocaleString("es-ES")}
                        {h.usuario ? ` · ${h.usuario}` : ""}
                      </span>
                      <p>{h.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear pieza"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={pedirEnlace !== null} onOpenChange={(o) => { if (!registrandoPedido && !o) setPedirEnlace(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Registrar pedido</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {pedirEnlace?.proveedor || "Proveedor"} — <span className="truncate">{pedirEnlace?.enlace}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pedCantidad">Cantidad</Label>
              <Input id="pedCantidad" type="number" min={1} step="1" value={pedidoCantidad} onChange={(e) => setPedidoCantidad(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pedFecha">Llegada aproximada</Label>
              <Input id="pedFecha" type="date" value={pedidoFecha} onChange={(e) => setPedidoFecha(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPedirEnlace(null)} disabled={registrandoPedido}>
              Cancelar
            </Button>
            <Button onClick={confirmarPedido} disabled={registrandoPedido}>
              {registrandoPedido ? "Guardando..." : "Confirmar pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
