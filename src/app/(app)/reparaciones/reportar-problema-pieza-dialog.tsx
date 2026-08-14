"use client";

import { useEffect, useState } from "react";
import { Danger, TickCircle, CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Pedido } from "@/lib/reparacion-detalle";
import type { Proveedor } from "@/app/api/proveedores/route";
import { esUrlValida } from "@/lib/validacion";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FilaProblema {
  tipoProblema: "defectuosa" | "rota";
  codigoDevolucion: string;
  descripcion: string;
  nuevoProveedor: string;
  nuevoEnlace: string;
  nuevoNumeroPedido: string;
  nuevaFechaEstimada: string;
}

function filaVacia(pedido: Pedido): FilaProblema {
  return {
    tipoProblema: "defectuosa",
    codigoDevolucion: "",
    descripcion: pedido.notas || "",
    nuevoProveedor: "",
    nuevoEnlace: "",
    nuevoNumeroPedido: "",
    nuevaFechaEstimada: "",
  };
}

/**
 * Reproduce #modalProblemaPieza (abrirModalProblemaPieza/guardarProblemaPieza,
 * Index.html) — sobre piezas ya "Recibidas", marca la(s) seleccionada(s) como
 * Defectuosa/Rota y registra de inmediato su pedido de reemplazo (proveedor,
 * enlace, número y fecha estimada propios). El endpoint del backend
 * (/v1/pedidos/:pedidoId/reportar-problema) ya existía sin ningún llamador en
 * el frontend — el original permite seleccionar varias piezas de golpe, así
 * que aquí también, llamando una vez por pieza seleccionada (mismo patrón que
 * RecepcionPedidosDialog con selección múltiple).
 */
export function ReportarProblemaPiezaDialog({
  pedidosRecibidos,
  open,
  onOpenChange,
  onReportado,
}: {
  pedidosRecibidos: Pedido[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportado: () => void;
}) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [filas, setFilas] = useState<Record<string, FilaProblema>>({});
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSeleccionados(new Set());
    setFilas(Object.fromEntries(pedidosRecibidos.map((p) => [p.pedidoId, filaVacia(p)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    fetch("/api/proveedores").then((r) => r.json()).then((d) => { if (d.ok) setProveedores(d.proveedores); }).catch(() => {});
  }, []);

  function alternar(pedidoId: string, marcado: boolean) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (marcado) next.add(pedidoId);
      else next.delete(pedidoId);
      return next;
    });
  }

  function actualizarFila<K extends keyof FilaProblema>(pedidoId: string, campo: K, valor: FilaProblema[K]) {
    setFilas((prev) => ({ ...prev, [pedidoId]: { ...prev[pedidoId], [campo]: valor } }));
  }

  async function confirmar() {
    if (seleccionados.size === 0) return toast.error("Debe seleccionar al menos una pieza con problema");

    for (const pedidoId of seleccionados) {
      const f = filas[pedidoId];
      const pedido = pedidosRecibidos.find((p) => p.pedidoId === pedidoId);
      const nombre = pedido?.notas || pedidoId;
      if (f.tipoProblema === "defectuosa" && !f.codigoDevolucion.trim()) return toast.error(`${nombre}: el código de devolución es obligatorio para piezas defectuosas`);
      if (!f.descripcion.trim()) return toast.error(`${nombre}: la descripción es obligatoria`);
      if (!f.nuevoProveedor) return toast.error(`${nombre}: el proveedor es obligatorio`);
      if (!f.nuevoEnlace.trim()) return toast.error(`${nombre}: el enlace de compra es obligatorio`);
      if (!esUrlValida(f.nuevoEnlace)) return toast.error(`${nombre}: el enlace debe ser una URL válida (https://...)`);
      if (!f.nuevoNumeroPedido.trim()) return toast.error(`${nombre}: el número de pedido es obligatorio`);
      if (!f.nuevaFechaEstimada) return toast.error(`${nombre}: la fecha estimada es obligatoria`);
    }

    setEnviando(true);
    try {
      for (const pedidoId of seleccionados) {
        const f = filas[pedidoId];
        const pedido = pedidosRecibidos.find((p) => p.pedidoId === pedidoId);
        const res = await fetch(`/api/pedidos/${pedidoId}/reportar-problema`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipoProblema: f.tipoProblema,
            codigoDevolucion: f.codigoDevolucion,
            descripcion: f.descripcion,
            nuevoProveedor: f.nuevoProveedor,
            nuevoEnlace: f.nuevoEnlace,
            nuevoNumeroPedido: f.nuevoNumeroPedido,
            nuevaFechaEstimada: f.nuevaFechaEstimada,
            piezaId: pedido?.piezaId || "",
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
      }
      toast.success(`Problema(s) reportado(s). ${seleccionados.size} pedido(s) de reemplazo registrado(s).`);
      onOpenChange(false);
      onReportado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-h-[85vh] max-w-3xl gap-0 overflow-y-auto p-0 sm:max-w-3xl" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-amber-500 px-5 py-3.5 text-white">
          <Danger className="size-5 shrink-0" />
          <DialogTitle className="text-base font-semibold text-white">Reportar Problema con Pieza</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => onOpenChange(false)} disabled={enviando}>
            <CloseCircle className="size-5" />
          </Button>
        </header>

        <div className="space-y-3 bg-muted/20 p-5">
          {pedidosRecibidos.length === 0 ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
              No se encontraron piezas recibidas para reportar problema.
            </p>
          ) : (
            pedidosRecibidos.map((pedido, i) => {
              const marcado = seleccionados.has(pedido.pedidoId);
              const f = filas[pedido.pedidoId] || filaVacia(pedido);
              return (
                <div key={pedido.pedidoId} className="rounded-lg border bg-card shadow-sm">
                  <label className="flex items-center gap-2.5 rounded-t-lg bg-amber-500/10 px-3 py-2.5">
                    <Checkbox checked={marcado} onCheckedChange={(v) => alternar(pedido.pedidoId, v === true)} />
                    <span className="text-sm font-semibold">Pieza #{i + 1}: {pedido.notas || "Sin descripción"}</span>
                  </label>

                  {marcado && (
                    <div className="space-y-3 p-3">
                      <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/50 p-2.5 text-xs">
                        <div><span className="text-muted-foreground">Proveedor:</span><br /><strong>{proveedores.find((pv) => pv.proveedorId === pedido.proveedorId)?.nombre || pedido.compradoPor || "-"}</strong></div>
                        <div><span className="text-muted-foreground">Nº Pedido:</span><br /><strong>{pedido.numeroPedido || "-"}</strong></div>
                        <div><span className="text-muted-foreground">Pedido ID:</span><br /><strong>{pedido.pedidoId}</strong></div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Tipo de Problema *</Label>
                        <RadioGroup value={f.tipoProblema} onValueChange={(v) => actualizarFila(pedido.pedidoId, "tipoProblema", v as "defectuosa" | "rota")} className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-sm">
                            <RadioGroupItem value="defectuosa" /> Defectuosa
                          </label>
                          <label className="flex items-center gap-1.5 text-sm">
                            <RadioGroupItem value="rota" /> Rota
                          </label>
                        </RadioGroup>
                      </div>

                      {f.tipoProblema === "defectuosa" && (
                        <div className="space-y-1.5">
                          <Label htmlFor={`cod-${pedido.pedidoId}`}>Código de Devolución *</Label>
                          <Input id={`cod-${pedido.pedidoId}`} placeholder="Ej: RMA-123456" value={f.codigoDevolucion} onChange={(e) => actualizarFila(pedido.pedidoId, "codigoDevolucion", e.target.value)} />
                        </div>
                      )}

                      <hr />
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Nuevo Pedido de Reemplazo</p>

                      <div className="space-y-1.5">
                        <Label htmlFor={`desc-${pedido.pedidoId}`}>Descripción de la pieza *</Label>
                        <Input id={`desc-${pedido.pedidoId}`} placeholder="Ej: Pantalla LCD iPhone 12" value={f.descripcion} onChange={(e) => actualizarFila(pedido.pedidoId, "descripcion", e.target.value)} />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Proveedor *</Label>
                          <Select value={f.nuevoProveedor} onValueChange={(v) => actualizarFila(pedido.pedidoId, "nuevoProveedor", v || "")}>
                            <SelectTrigger className="w-full">
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
                          <Label htmlFor={`enlace-${pedido.pedidoId}`}>Enlace de Compra *</Label>
                          <Input id={`enlace-${pedido.pedidoId}`} type="url" placeholder="https://..." value={f.nuevoEnlace} onChange={(e) => actualizarFila(pedido.pedidoId, "nuevoEnlace", e.target.value)} />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`num-${pedido.pedidoId}`}>Nº Pedido Nuevo *</Label>
                          <Input id={`num-${pedido.pedidoId}`} placeholder="Ej: 112-8866544-7799" value={f.nuevoNumeroPedido} onChange={(e) => actualizarFila(pedido.pedidoId, "nuevoNumeroPedido", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`fecha-${pedido.pedidoId}`}>Fecha Estimada Entrega *</Label>
                          <Input id={`fecha-${pedido.pedidoId}`} type="date" min={hoyISO()} value={f.nuevaFechaEstimada} onChange={(e) => actualizarFila(pedido.pedidoId, "nuevaFechaEstimada", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={confirmar} disabled={enviando || pedidosRecibidos.length === 0}>
            <TickCircle className="size-3.5" /> {enviando ? "Reportando..." : "Reportar y Pedir Nueva Pieza"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
