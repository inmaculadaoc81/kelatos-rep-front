"use client";

import { useEffect, useState } from "react";
import { UserAdd } from "@/lib/icons";
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
import { Cliente, ClienteFormData } from "@/lib/clientes";
import { esEmailValido } from "@/lib/validacion";

function vacio(): ClienteFormData {
  return { nombre: "", dniCif: "", telefono: "", email: "", direccion: "", cp: "", localidad: "", provincia: "", notas: "" };
}

function desdeExistente(c: Cliente): ClienteFormData {
  return {
    nombre: c.nombre,
    dniCif: c.dniCif,
    telefono: c.telefono,
    email: c.email,
    direccion: c.direccion,
    cp: c.cp,
    localidad: c.localidad,
    provincia: c.provincia,
    notas: c.notas,
  };
}

export function ClienteFormDialog({
  clienteExistente,
  open,
  onOpenChange,
  onGuardado,
}: {
  clienteExistente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: (cliente: Cliente) => void;
}) {
  const [datos, setDatos] = useState<ClienteFormData>(() => (clienteExistente ? desdeExistente(clienteExistente) : vacio()));
  const [enviando, setEnviando] = useState(false);
  const esEdicion = clienteExistente !== null;

  // El diálogo se monta una sola vez y solo se abre/cierra (no se
  // desmonta entre ediciones) — sin esto, el inicializador perezoso de
  // useState de arriba solo corre en el montaje inicial, así que al
  // editar un cliente distinto el formulario se quedaba con los datos
  // del cliente anterior (o vacío, si el primer uso fue "Nuevo cliente").
  useEffect(() => {
    if (open) setDatos(clienteExistente ? desdeExistente(clienteExistente) : vacio());
  }, [open, clienteExistente]);

  function actualizar<K extends keyof ClienteFormData>(campo: K, valor: string) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.nombre.trim()) return toast.error("El nombre es obligatorio");
    if (!esEmailValido(datos.email)) return toast.error("El email no es válido");

    setEnviando(true);
    try {
      const url = esEdicion ? `/api/clientes/${clienteExistente!.codigo}` : "/api/clientes";
      const res = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esEdicion ? "Cliente actualizado" : `Cliente creado (código ${data.cliente.codigo})`);
      onOpenChange(false);
      onGuardado(data.cliente);
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
        if (!o) setDatos(clienteExistente ? desdeExistente(clienteExistente) : vacio());
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserAdd className="size-5" /> {esEdicion ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" value={datos.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dniCif">DNI / CIF</Label>
              <Input id="dniCif" value={datos.dniCif} onChange={(e) => actualizar("dniCif", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" value={datos.telefono} onChange={(e) => actualizar("telefono", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={datos.email} onChange={(e) => actualizar("email", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" value={datos.direccion} onChange={(e) => actualizar("direccion", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp">CP</Label>
              <Input id="cp" value={datos.cp} onChange={(e) => actualizar("cp", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="localidad">Localidad</Label>
              <Input id="localidad" value={datos.localidad} onChange={(e) => actualizar("localidad", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="provincia">Provincia</Label>
              <Input id="provincia" value={datos.provincia} onChange={(e) => actualizar("provincia", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" rows={2} value={datos.notas} onChange={(e) => actualizar("notas", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
