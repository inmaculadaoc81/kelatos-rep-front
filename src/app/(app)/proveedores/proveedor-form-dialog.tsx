"use client";

import { useEffect, useState } from "react";
import { Truck } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Proveedor, ProveedorFormData } from "@/lib/proveedores";
import { esEmailValido } from "@/lib/validacion";

function vacio(): ProveedorFormData {
  return { nombre: "", dniCif: "", direccionFiscal: "", pais: "", telefono: "", email: "", codigoInterno: "", notas: "" };
}

function desdeExistente(p: Proveedor): ProveedorFormData {
  return {
    nombre: p.nombre, dniCif: p.dniCif, direccionFiscal: p.direccionFiscal, pais: p.pais,
    telefono: p.telefono, email: p.email, codigoInterno: p.codigoInterno, notas: p.notas,
  };
}

export function ProveedorFormDialog({
  proveedorExistente,
  open,
  onOpenChange,
  onGuardado,
}: {
  proveedorExistente: Proveedor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: (proveedor: Proveedor) => void;
}) {
  const [datos, setDatos] = useState<ProveedorFormData>(() => (proveedorExistente ? desdeExistente(proveedorExistente) : vacio()));
  const [enviando, setEnviando] = useState(false);
  const esEdicion = proveedorExistente !== null;

  useEffect(() => {
    if (open) setDatos(proveedorExistente ? desdeExistente(proveedorExistente) : vacio());
  }, [open, proveedorExistente]);

  function actualizar<K extends keyof ProveedorFormData>(campo: K, valor: string) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.nombre.trim()) return toast.error("El nombre es obligatorio");
    if (datos.email && !esEmailValido(datos.email)) return toast.error("El email no es válido");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/proveedores/${proveedorExistente!.proveedorId}` : "/api/proveedores";
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Proveedor actualizado" : "Proveedor creado");
      onOpenChange(false);
      onGuardado(data.proveedor);
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
        if (!o) setDatos(proveedorExistente ? desdeExistente(proveedorExistente) : vacio());
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5" /> {esEdicion ? "Editar proveedor" : "Nuevo proveedor"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pvNombre">Nombre / Razón social *</Label>
              <Input id="pvNombre" value={datos.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pvDniCif">DNI / CIF</Label>
              <Input id="pvDniCif" value={datos.dniCif} onChange={(e) => actualizar("dniCif", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pvCodigoInterno">Código interno</Label>
              <Input id="pvCodigoInterno" value={datos.codigoInterno} onChange={(e) => actualizar("codigoInterno", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pvTelefono">Teléfono</Label>
              <Input id="pvTelefono" value={datos.telefono} onChange={(e) => actualizar("telefono", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pvEmail">Email</Label>
              <Input id="pvEmail" type="email" value={datos.email} onChange={(e) => actualizar("email", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pvDireccion">Dirección fiscal</Label>
              <Input id="pvDireccion" value={datos.direccionFiscal} onChange={(e) => actualizar("direccionFiscal", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pvPais">País</Label>
              <Input id="pvPais" value={datos.pais} onChange={(e) => actualizar("pais", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pvNotas">Notas</Label>
            <Textarea id="pvNotas" rows={2} value={datos.notas} onChange={(e) => actualizar("notas", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
