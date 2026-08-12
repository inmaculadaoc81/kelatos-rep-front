"use client";

import { useEffect, useState } from "react";
import { Box, Add, Trash, InfoCircle, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { DatosRegistrarPedido, PiezaPedidoForm } from "@/app/api/reparaciones/[resguardo]/pedidos/route";
import type { Empleado } from "@/app/api/empleados/route";
import type { Proveedor } from "@/app/api/proveedores/route";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { esUrlValida } from "@/lib/validacion";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function piezaVacia(): PiezaPedidoForm {
  return { descripcion: "", proveedor: "", enlace: "", numeroPedido: "", fechaEstimada: "" };
}

/**
 * Reproduce la precarga de abrirModalRegistrarPedido() (Index.html):
 * toma las piezas tipo "pedido" de TODOS los presupuestos ya aceptados con
 * tipoPieza 'pedido'/'mixto' (descripción, proveedor, enlace, piezaId para
 * enlazar el pedido con esa pieza concreta) — siguen siendo editables, solo
 * se evita volver a escribir lo que ya se rellenó al crear el presupuesto.
 * Si no hay ninguna pieza de presupuesto pendiente, arranca con una fila
 * vacía (mismo fallback que agregarPieza() en el original).
 */
function piezasIniciales(detalle: ReparacionDetalle): PiezaPedidoForm[] {
  const pptosAceptados = detalle.presupuestos.filter(
    (p) => p.estado === "aceptado" && (p.tipoPieza === "pedido" || p.tipoPieza === "mixto")
  );
  const piezas: PiezaPedidoForm[] = [];
  for (const ppto of pptosAceptados) {
    for (const pz of ppto.piezas) {
      if (!pz.tipo || pz.tipo === "pedido") {
        piezas.push({
          piezaId: pz.piezaId,
          descripcion: pz.descripcion || "",
          proveedor: pz.proveedorId || "",
          enlace: pz.enlace || "",
          numeroPedido: "",
          fechaEstimada: "",
        });
      }
    }
  }
  return piezas.length > 0 ? piezas : [piezaVacia()];
}

const ESTADOS_PEDIDO_EDITABLES = ["Pendiente", "Pedido", "En Tránsito"];

/**
 * Reproduce abrirModalEditarPedido() (Index.html) — precarga desde los
 * pedidos ya existentes (no desde el presupuesto) para poder corregir
 * datos ya registrados; el pedidoId de cada fila hace que el guardado
 * actualice esa fila en vez de crear una nueva.
 */
function piezasParaEditar(detalle: ReparacionDetalle): PiezaPedidoForm[] {
  const pedidos = detalle.pedidos.filter((p) => ESTADOS_PEDIDO_EDITABLES.includes(p.estado));
  return pedidos.map((p) => ({
    pedidoId: p.pedidoId,
    piezaId: p.piezaId,
    descripcion: p.notas || "",
    proveedor: p.proveedorId || "",
    enlace: p.enlace || "",
    numeroPedido: p.numeroPedido || "",
    fechaEstimada: p.fechaEstimada ? p.fechaEstimada.slice(0, 10) : "",
  }));
}

/**
 * Reproduce #modalRegistrarPedido (abrirModalRegistrarPedido/
 * guardarPedidoPieza) del original — cabecera Datos Generales (una sola
 * vez) + N tarjetas "Piezas a Pedir", cada una con su propio proveedor,
 * enlace, número de pedido y fecha estimada. El backend
 * (/v1/reparaciones/:resguardo/pedidos) ya aceptaba el array completo de
 * piezas de un tirón — solo el diálogo estaba simplificado a una sola
 * pieza sin responsable ni fecha de pedido.
 *
 * El campo "Enlace de Compra" no lleva asterisco en el HTML del original,
 * pero guardarPedidoPieza() lo exige igual que el resto ("falta enlace" si
 * viene vacío) — se replica esa validación real, no la que sugiere la
 * etiqueta.
 */
export function RegistrarPedidoDialog({
  detalle,
  modo = "crear",
  open,
  onOpenChange,
  onRegistrado,
}: {
  detalle: ReparacionDetalle;
  modo?: "crear" | "editar";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrado: () => void;
}) {
  const esEdicion = modo === "editar";
  const [compradoPor, setCompradoPor] = useState("");
  const [fechaPedido, setFechaPedido] = useState(hoyISO());
  const [piezas, setPiezas] = useState<PiezaPedidoForm[]>([piezaVacia()]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (esEdicion) {
      const pendientes = detalle.pedidos.filter((p) => ESTADOS_PEDIDO_EDITABLES.includes(p.estado));
      setCompradoPor(pendientes[0]?.compradoPor || "");
      setFechaPedido(pendientes[0]?.fechaPedido ? pendientes[0].fechaPedido.slice(0, 10) : hoyISO());
      setPiezas(piezasParaEditar(detalle));
    } else {
      setCompradoPor("");
      setFechaPedido(hoyISO());
      setPiezas(piezasIniciales(detalle));
    }
    // Solo se recarga al abrir, no en cada cambio de "detalle" — evita
    // perder lo que el usuario ya haya editado si el detalle se refresca
    // mientras el diálogo sigue abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    fetch("/api/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados); }).catch(() => {});
    fetch("/api/proveedores").then((r) => r.json()).then((d) => { if (d.ok) setProveedores(d.proveedores); }).catch(() => {});
  }, []);

  function actualizarPieza<K extends keyof PiezaPedidoForm>(i: number, campo: K, valor: PiezaPedidoForm[K]) {
    setPiezas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  function validar(): string | null {
    if (!compradoPor) return "El responsable de compra es obligatorio";
    if (!fechaPedido) return "La fecha de pedido es obligatoria";
    for (let i = 0; i < piezas.length; i++) {
      const p = piezas[i];
      if (!p.descripcion.trim()) return `Pieza ${i + 1}: falta descripción`;
      if (!p.proveedor.trim()) return `Pieza ${i + 1}: falta proveedor`;
      if (!p.enlace.trim()) return `Pieza ${i + 1}: falta enlace`;
      if (!esUrlValida(p.enlace)) return `Pieza ${i + 1}: el enlace debe ser una URL válida (https://...)`;
      if (!p.numeroPedido.trim()) return `Pieza ${i + 1}: falta número de pedido`;
      if (!p.fechaEstimada) return `Pieza ${i + 1}: falta fecha estimada`;
    }
    return null;
  }

  async function confirmar() {
    const error = validar();
    if (error) return toast.error(error);

    setEnviando(true);
    try {
      const datos: DatosRegistrarPedido = { compradoPor, fechaPedido, piezas };
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Pedido actualizado" : `${piezas.length} pedido(s) registrado(s)`);
      onOpenChange(false);
      onRegistrado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-3xl gap-0 p-0 sm:max-w-3xl" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-cyan-500 px-5 py-3.5 text-white">
          <Box className="size-5 shrink-0" />
          <DialogTitle className="text-base font-semibold text-white">{esEdicion ? "Editar Pedido" : "Registrar Pedido de Pieza(s)"}</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => onOpenChange(false)} disabled={enviando}>
            <CloseCircle className="size-5" />
          </Button>
        </header>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto bg-muted/20 p-5">
          <div>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-400">
              <InfoCircle className="size-4" /> Datos Generales
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Responsable de Compra *</Label>
                <Select value={compradoPor} onValueChange={(v) => setCompradoPor(v || "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    {empleados.map((e) => <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pedidoFecha">Fecha de Pedido *</Label>
                <Input id="pedidoFecha" type="date" max={hoyISO()} value={fechaPedido} onChange={(e) => setFechaPedido(e.target.value)} />
                <p className="text-xs text-muted-foreground">No se permiten fechas futuras</p>
              </div>
            </div>
          </div>

          <hr />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                <Box className="size-4" /> Piezas a Pedir
              </p>
              <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setPiezas((prev) => [...prev, piezaVacia()])}>
                <Add className="size-3.5" /> Agregar Pieza
              </Button>
            </div>

            <div className="space-y-3">
              {piezas.map((p, i) => (
                <div key={i} className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between rounded-t-lg bg-muted/60 px-3 py-2">
                    <strong className="text-sm">Pieza #{i + 1}</strong>
                    {piezas.length > 1 && (
                      <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => setPiezas((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash className="size-3.5" /> Eliminar
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3 p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`pedDesc-${i}`}>Descripción de la pieza *</Label>
                      <Input id={`pedDesc-${i}`} placeholder="Ej: Pantalla LCD iPhone 12" value={p.descripcion} onChange={(e) => actualizarPieza(i, "descripcion", e.target.value)} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Proveedor *</Label>
                        <Select value={p.proveedor} onValueChange={(v) => actualizarPieza(i, "proveedor", v || "")}>
                          <SelectTrigger className="w-full">
                            {/* El popup solo existe en el DOM mientras está abierto, así que
                                Select.Value no puede resolver la etiqueta del valor ya
                                seleccionado (p.ej. al precargar desde el presupuesto) salvo
                                que se le indique explícitamente cómo hacerlo — si no, muestra
                                el id crudo en vez del nombre del proveedor. */}
                            <SelectValue>
                              {(v: string) => (v ? proveedores.find((prov) => prov.proveedorId === v)?.nombre || v : "Seleccionar proveedor...")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {proveedores.map((prov) => <SelectItem key={prov.proveedorId} value={prov.proveedorId}>{prov.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`pedEnlace-${i}`}>Enlace de Compra</Label>
                        <Input id={`pedEnlace-${i}`} type="url" placeholder="https://..." value={p.enlace} onChange={(e) => actualizarPieza(i, "enlace", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`pedNum-${i}`}>Número de Pedido *</Label>
                        <Input id={`pedNum-${i}`} value={p.numeroPedido} onChange={(e) => actualizarPieza(i, "numeroPedido", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`pedFechaEst-${i}`}>Fecha Estimada de Entrega *</Label>
                        <Input id={`pedFechaEst-${i}`} type="date" min={hoyISO()} value={p.fechaEstimada} onChange={(e) => actualizarPieza(i, "fechaEstimada", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button className="gap-1.5 bg-cyan-600 text-white hover:bg-cyan-700" onClick={confirmar} disabled={enviando}>
            {enviando ? "Guardando..." : esEdicion ? "Guardar Cambios" : "Guardar Pedido"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
