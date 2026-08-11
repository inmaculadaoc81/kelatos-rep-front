"use client";

import { useState } from "react";
import { Box1 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { DatosRegistrarPedido } from "@/app/api/reparaciones/[resguardo]/pedidos/route";

const VACIO: DatosRegistrarPedido = { descripcion: "", proveedor: "", enlace: "", numeroPedido: "", fechaEstimada: "" };

/**
 * Reproduce abrirModalRegistrarPedido() del original — registra el pedido de
 * la pieza al proveedor y pasa el estado de la reparación a "Pieza
 * Pendiente" (lo hace el propio backend en /pedidos, no hace falta pedirlo
 * aquí). Aparece desde varios estados (Garantía, Presupuesto Aceptado, En
 * Reparación), de ahí que sea un diálogo aparte reutilizable en vez de
 * vivir dentro de AccionRequerida.
 */
export function RegistrarPedidoDialog({
  resguardo,
  open,
  onOpenChange,
  onRegistrado,
}: {
  resguardo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrado: () => void;
}) {
  const [datos, setDatos] = useState<DatosRegistrarPedido>(VACIO);
  const [enviando, setEnviando] = useState(false);

  function actualizar<K extends keyof DatosRegistrarPedido>(campo: K, valor: DatosRegistrarPedido[K]) {
    setDatos((p) => ({ ...p, [campo]: valor }));
  }

  async function confirmar() {
    if (!datos.descripcion.trim()) return toast.error("La descripción de la pieza es obligatoria");
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pedido de pieza registrado");
      onOpenChange(false);
      setDatos(VACIO);
      onRegistrado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box1 className="size-5" /> Registrar pedido de pieza
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pedDescripcion">Descripción de la pieza *</Label>
            <Textarea id="pedDescripcion" rows={2} value={datos.descripcion} onChange={(e) => actualizar("descripcion", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pedProveedor">Proveedor</Label>
            <Input id="pedProveedor" value={datos.proveedor} onChange={(e) => actualizar("proveedor", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pedEnlace">Enlace de compra</Label>
            <Input id="pedEnlace" value={datos.enlace} onChange={(e) => actualizar("enlace", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pedNumero">Nº de pedido</Label>
              <Input id="pedNumero" value={datos.numeroPedido} onChange={(e) => actualizar("numeroPedido", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pedFecha">Fecha estimada</Label>
              <Input id="pedFecha" type="date" value={datos.fechaEstimada} onChange={(e) => actualizar("fechaEstimada", e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando ? "Guardando..." : "Registrar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
