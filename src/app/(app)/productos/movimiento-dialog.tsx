"use client";

import { useState } from "react";
import { ArrowSwapHorizontal } from "@/lib/icons";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Producto, DatosMovimiento, TipoMovimiento } from "@/lib/productos";

const VACIO: DatosMovimiento = { tipo: "Entrada", cantidad: 0, proveedor: "", numeroDocumento: "", precioUnitario: 0, total: 0, notas: "" };

export function MovimientoDialog({
  producto,
  open,
  onOpenChange,
  onRegistrado,
}: {
  producto: Producto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrado: () => void;
}) {
  const [datos, setDatos] = useState<DatosMovimiento>(VACIO);
  const [enviando, setEnviando] = useState(false);

  function actualizar<K extends keyof DatosMovimiento>(campo: K, valor: DatosMovimiento[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  const stockResultante = producto
    ? datos.tipo === "Entrada"
      ? producto.stockActual + datos.cantidad
      : datos.tipo === "Salida"
        ? producto.stockActual - datos.cantidad
        : datos.cantidad
    : 0;

  async function guardar() {
    if (!producto) return;
    if (datos.cantidad === 0 && datos.tipo !== "Ajuste") return toast.error("La cantidad debe ser distinta de 0");

    setEnviando(true);
    try {
      const res = await fetch("/api/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: producto.id, datos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Movimiento registrado — stock: ${data.producto.stockActual}`);
      setDatos(VACIO);
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
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowSwapHorizontal className="size-5" /> Movimiento — {producto?.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <RadioGroup value={datos.tipo} onValueChange={(v) => actualizar("tipo", v as TipoMovimiento)} className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="Entrada" /> Entrada
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="Salida" /> Salida
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="Ajuste" /> Ajuste
            </label>
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="cantidadMov">{datos.tipo === "Ajuste" ? "Nuevo stock total" : "Cantidad"}</Label>
            <Input id="cantidadMov" type="number" value={datos.cantidad} onChange={(e) => actualizar("cantidad", parseFloat(e.target.value) || 0)} />
          </div>

          <p className="text-xs text-muted-foreground">
            Stock actual: {producto?.stockActual} {producto?.unidad} → resultante: {stockResultante} {producto?.unidad}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="proveedorMov">Proveedor/Cliente</Label>
              <Input id="proveedorMov" value={datos.proveedor} onChange={(e) => actualizar("proveedor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="documentoMov">Nº documento</Label>
              <Input id="documentoMov" value={datos.numeroDocumento} onChange={(e) => actualizar("numeroDocumento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="precioUnitarioMov">Precio unitario (€)</Label>
              <Input id="precioUnitarioMov" type="number" step="0.01" value={datos.precioUnitario} onChange={(e) => actualizar("precioUnitario", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalMov">Total (€)</Label>
              <Input id="totalMov" type="number" step="0.01" value={datos.total} onChange={(e) => actualizar("total", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notasMov">Notas</Label>
            <Textarea id="notasMov" rows={2} value={datos.notas} onChange={(e) => actualizar("notas", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Registrar movimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
