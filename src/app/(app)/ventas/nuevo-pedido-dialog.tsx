"use client";

import { useEffect, useState } from "react";
import { Add, Trash, ShoppingCart } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DatosNuevaVenta, ItemVentaForm } from "@/lib/ventas";
import type { Proveedor } from "@/app/api/proveedores/route";

const METODOS_PAGO = ["Efectivo", "Tarjeta", "Bizum", "Transferencia"];
const BANCOS = ["Santander", "Sabadell", "BBVA", "CaixaBank"];

function vacio(): DatosNuevaVenta {
  return { esGarantia: false, clienteNombre: "", clienteTelefono: "", clienteEmail: "", numeroFactura: "", metodoPago: "", banco: "", observaciones: "", items: [] };
}

function itemVacio(): ItemVentaForm {
  return { descripcion: "", costo: 0, precio: 0, proveedorId: "", enlace: "", notas: "" };
}

export function NuevoPedidoDialog({ onCreado }: { onCreado: () => void }) {
  const [open, setOpen] = useState(false);
  const [datos, setDatos] = useState<DatosNuevaVenta>(vacio());
  const [enviando, setEnviando] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setProveedores(data.proveedores); })
      .catch(() => {});
  }, []);

  function actualizar<K extends keyof DatosNuevaVenta>(campo: K, valor: DatosNuevaVenta[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarItem(i: number, campo: keyof ItemVentaForm, valor: string | number) {
    setDatos((prev) => ({ ...prev, items: prev.items.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)) }));
  }

  const totalPrecio = datos.esGarantia ? 0 : datos.items.reduce((s, i) => s + (Number(i.precio) || 0), 0);

  async function guardar() {
    if (!datos.clienteNombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!datos.esGarantia) {
      if (!datos.numeroFactura.trim()) return toast.error("El número de factura es obligatorio");
      if (!datos.metodoPago) return toast.error("Selecciona el método de pago");
      if (datos.metodoPago === "Tarjeta" && !datos.banco) return toast.error("Selecciona el banco");
    }
    if (datos.items.length === 0) return toast.error("Añade al menos una pieza");
    for (const it of datos.items) {
      if (!it.descripcion.trim()) return toast.error("Todas las piezas deben tener descripción");
      if (!it.costo || it.costo <= 0) return toast.error("El costo es obligatorio en todas las piezas");
      if (!datos.esGarantia && (!it.precio || it.precio <= 0)) return toast.error("El precio es obligatorio en todas las piezas");
      if (!it.proveedorId) return toast.error("El proveedor es obligatorio en todas las piezas");
      if (!it.enlace.trim()) return toast.error("El enlace es obligatorio en todas las piezas");
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Pedido ${data.venta.ventaId} creado`);
      setDatos(vacio());
      setOpen(false);
      onCreado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ size: "sm", className: "gap-1.5" })}>
        <ShoppingCart className="size-4" /> Nuevo Pedido
      </DialogTrigger>
      <DialogContent className="max-w-2xl sm:max-w-2xl" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle>Nuevo pedido de piezas</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-4 pr-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={datos.esGarantia} onCheckedChange={(v) => actualizar("esGarantia", v)} />
              Es garantía (sin cobro al cliente)
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clienteNombreVenta">Cliente *</Label>
                <Input id="clienteNombreVenta" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clienteTelefonoVenta">Teléfono</Label>
                <Input id="clienteTelefonoVenta" value={datos.clienteTelefono} onChange={(e) => actualizar("clienteTelefono", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clienteEmailVenta">Email</Label>
                <Input id="clienteEmailVenta" type="email" value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
              </div>
              {!datos.esGarantia && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="numeroFacturaVenta">Nº factura *</Label>
                    <Input id="numeroFacturaVenta" value={datos.numeroFactura} onChange={(e) => actualizar("numeroFactura", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Método de pago *</Label>
                    <Select value={datos.metodoPago} onValueChange={(v) => { actualizar("metodoPago", v || ""); if (v !== "Tarjeta") actualizar("banco", ""); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona —" /></SelectTrigger>
                      <SelectContent>
                        {METODOS_PAGO.map((m) => <SelectItem key={m} value={m}>{m === "Tarjeta" ? "Tarjeta bancaria" : m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {datos.metodoPago === "Tarjeta" && (
                    <div className="space-y-1.5">
                      <Label>Banco *</Label>
                      <Select value={datos.banco} onValueChange={(v) => actualizar("banco", v || "")}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="— Selecciona banco —" /></SelectTrigger>
                        <SelectContent>
                          {BANCOS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Piezas</Label>
                <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => actualizar("items", [...datos.items, itemVacio()])}>
                  <Add className="size-3.5" /> Agregar Pieza
                </Button>
              </div>
              {datos.items.length === 0 && <p className="text-xs text-muted-foreground">Sin piezas.</p>}
              <div className="space-y-2">
                {datos.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-md border p-2 sm:grid-cols-5">
                    <Input
                      className="col-span-2"
                      placeholder="Descripción *"
                      value={it.descripcion}
                      onChange={(e) => actualizarItem(i, "descripcion", e.target.value)}
                    />
                    <Input type="number" placeholder="Costo *" step="0.01" value={it.costo} onChange={(e) => actualizarItem(i, "costo", parseFloat(e.target.value) || 0)} />
                    <Input type="number" placeholder="Precio *" step="0.01" value={it.precio} onChange={(e) => actualizarItem(i, "precio", parseFloat(e.target.value) || 0)} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => actualizar("items", datos.items.filter((_, idx) => idx !== i))}
                    >
                      <Trash className="size-4" />
                    </Button>
                    <Select value={it.proveedorId} onValueChange={(v) => actualizarItem(i, "proveedorId", v || "")}>
                      <SelectTrigger className="col-span-2 w-full sm:col-span-2"><SelectValue placeholder="Proveedor *" /></SelectTrigger>
                      <SelectContent>
                        {proveedores.map((p) => <SelectItem key={p.proveedorId} value={p.proveedorId}>{p.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-2 sm:col-span-3"
                      placeholder="Enlace de compra *"
                      value={it.enlace}
                      onChange={(e) => actualizarItem(i, "enlace", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacionesVenta">Observaciones</Label>
              <Textarea id="observacionesVenta" rows={2} value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
            </div>

            {!datos.esGarantia && (
              <p className="rounded-md border bg-muted/30 p-2.5 text-sm font-semibold">Total: {totalPrecio.toFixed(2)} €</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Crear pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
