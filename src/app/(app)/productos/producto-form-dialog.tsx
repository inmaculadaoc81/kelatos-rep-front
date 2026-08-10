"use client";

import { useState } from "react";
import { Box1 } from "@/lib/icons";
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
import { toast } from "sonner";
import { Producto, DatosProductoForm } from "@/lib/productos";

function vacio(): DatosProductoForm {
  return { nombre: "", referencia: "", categoria: "", stockActual: 0, unidad: "uds", stockMinimo: 0, precioCompra: 0, precioVenta: 0, proveedor: "", ubicacion: "", notas: "" };
}

function desdeExistente(p: Producto): DatosProductoForm {
  return {
    nombre: p.nombre,
    referencia: p.referencia,
    categoria: p.categoria,
    stockActual: p.stockActual,
    unidad: p.unidad,
    stockMinimo: p.stockMinimo,
    precioCompra: p.precioCompra,
    precioVenta: p.precioVenta,
    proveedor: p.proveedor,
    ubicacion: p.ubicacion,
    notas: p.notas,
  };
}

export function ProductoFormDialog({
  productoExistente,
  open,
  onOpenChange,
  onGuardado,
}: {
  productoExistente: Producto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosProductoForm>(() => (productoExistente ? desdeExistente(productoExistente) : vacio()));
  const [enviando, setEnviando] = useState(false);
  const esEdicion = productoExistente !== null;

  function actualizar<K extends keyof DatosProductoForm>(campo: K, valor: DatosProductoForm[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.nombre.trim()) return toast.error("El nombre es obligatorio");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/productos/${productoExistente!.id}` : "/api/productos";
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Producto actualizado" : `Producto creado (${data.producto.id})`);
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
        if (!o) setDatos(productoExistente ? desdeExistente(productoExistente) : vacio());
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box1 className="size-5" /> {esEdicion ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombreProd">Nombre *</Label>
              <Input id="nombreProd" value={datos.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referenciaProd">Referencia</Label>
              <Input id="referenciaProd" value={datos.referencia} onChange={(e) => actualizar("referencia", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoriaProd">Categoría</Label>
              <Input id="categoriaProd" value={datos.categoria} onChange={(e) => actualizar("categoria", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unidadProd">Unidad</Label>
              <Input id="unidadProd" value={datos.unidad} onChange={(e) => actualizar("unidad", e.target.value)} />
            </div>
            {!esEdicion && (
              <div className="space-y-1.5">
                <Label htmlFor="stockActualProd">Stock inicial</Label>
                <Input id="stockActualProd" type="number" min={0} value={datos.stockActual} onChange={(e) => actualizar("stockActual", parseFloat(e.target.value) || 0)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="stockMinimoProd">Stock mínimo (alerta)</Label>
              <Input id="stockMinimoProd" type="number" min={0} value={datos.stockMinimo} onChange={(e) => actualizar("stockMinimo", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="precioCompraProd">Precio compra (€)</Label>
              <Input id="precioCompraProd" type="number" step="0.01" value={datos.precioCompra} onChange={(e) => actualizar("precioCompra", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="precioVentaProd">Precio venta (€)</Label>
              <Input id="precioVentaProd" type="number" step="0.01" value={datos.precioVenta} onChange={(e) => actualizar("precioVenta", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proveedorProd">Proveedor</Label>
              <Input id="proveedorProd" value={datos.proveedor} onChange={(e) => actualizar("proveedor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ubicacionProd">Ubicación</Label>
              <Input id="ubicacionProd" value={datos.ubicacion} onChange={(e) => actualizar("ubicacion", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notasProd">Notas</Label>
            <Textarea id="notasProd" rows={2} value={datos.notas} onChange={(e) => actualizar("notas", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
