"use client";

import { useState } from "react";
import { Edit2 } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Venta, DatosEditarVenta } from "@/lib/ventas";

const ESTADOS_VENTA = ["Pedido por Completar", "Pieza Pendiente", "En Tránsito", "Pieza Recibida", "Entregado", "Cancelado"];
const ESTADOS_PAGO = ["Pagado", "Pendiente", "Garantía"];

function desde(v: Venta): DatosEditarVenta {
  return { clienteNombre: v.clienteNombre, clienteTelefono: v.clienteTelefono, clienteEmail: v.clienteEmail, observaciones: v.observaciones, estado: v.estado, estadoPago: v.estadoPago };
}

export function EditarVentaDialog({
  venta,
  open,
  onOpenChange,
  onGuardado,
}: {
  venta: Venta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosEditarVenta | null>(venta ? desde(venta) : null);
  const [enviando, setEnviando] = useState(false);

  function actualizar<K extends keyof DatosEditarVenta>(campo: K, valor: string) {
    setDatos((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function guardar() {
    if (!venta || !datos) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/ventas/${venta.ventaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pedido actualizado");
      onOpenChange(false);
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (enviando) return;
        if (o && venta) setDatos(desde(venta));
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="size-5" /> Editar pedido #{venta?.ventaId}
          </DialogTitle>
        </DialogHeader>

        {datos && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clienteNombreEdit">Cliente</Label>
                <Input id="clienteNombreEdit" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clienteTelefonoEdit">Teléfono</Label>
                <Input id="clienteTelefonoEdit" value={datos.clienteTelefono} onChange={(e) => actualizar("clienteTelefono", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="clienteEmailEdit">Email</Label>
                <Input id="clienteEmailEdit" type="email" value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={datos.estado} onValueChange={(v) => actualizar("estado", v || datos.estado)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_VENTA.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado de pago</Label>
                <Select value={datos.estadoPago} onValueChange={(v) => actualizar("estadoPago", v || datos.estadoPago)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_PAGO.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacionesEdit">Observaciones</Label>
              <Textarea id="observacionesEdit" rows={2} value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
