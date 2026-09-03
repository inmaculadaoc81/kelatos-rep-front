"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { esEmailValido } from "@/lib/validacion";
import type { AlquilerResumen, DatosClienteAlquiler } from "@/lib/equipos";

/**
 * Editar los datos del cliente de un alquiler ya existente — petición del
 * usuario, 2026-09-03, tras encontrar el caso EQ-024/ALQ-0012 (el correo
 * de confirmación de un alquiler no coincidía con el cliente que aparece
 * hoy en el registro, sin forma de corregirlo desde el dashboard).
 * Reproduce actualizarClienteAlquiler() (backend/Equipos.js) vía
 * POST /v1/alquileres/:id/cliente, ya expuesto en el backend pero sin
 * ningún botón que lo llamara.
 */
export function EditarClienteAlquilerDialog({
  alquiler,
  open,
  onOpenChange,
  onActualizado,
}: {
  alquiler: AlquilerResumen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: () => void;
}) {
  const [datos, setDatos] = useState<DatosClienteAlquiler>({
    clienteNombre: "",
    clienteTelefono: "",
    clienteDNI: "",
    clienteEmail: "",
    clienteDireccion: "",
    reenviarEmail: false,
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (alquiler && open) {
      setDatos({
        clienteNombre: alquiler.clienteNombre || "",
        clienteTelefono: alquiler.clienteTelefono || "",
        clienteDNI: alquiler.clienteDNI || "",
        clienteEmail: alquiler.clienteEmail || "",
        clienteDireccion: alquiler.clienteDireccion || "",
        reenviarEmail: false,
      });
    }
  }, [alquiler, open]);

  function actualizar<K extends keyof DatosClienteAlquiler>(campo: K, valor: DatosClienteAlquiler[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  async function guardar() {
    if (!alquiler) return;
    if (!datos.clienteNombre.trim()) return toast.error("El nombre es obligatorio");
    if (!datos.clienteTelefono.trim()) return toast.error("El teléfono es obligatorio");
    if (!datos.clienteDNI.trim()) return toast.error("El DNI es obligatorio");
    if (!datos.clienteEmail.trim() || !esEmailValido(datos.clienteEmail)) return toast.error("Email inválido");

    setGuardando(true);
    try {
      const res = await fetch(`/api/alquileres/${alquiler.alquilerId}/cliente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(datos.reenviarEmail ? "Cliente actualizado y correo reenviado" : "Cliente actualizado");
      onActualizado();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  if (!alquiler) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Editar cliente del alquiler</DialogTitle>
        <p className="text-sm text-muted-foreground">
          {alquiler.alquilerId} — corrige los datos si hay un error, por ejemplo un email mal escrito.
        </p>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="edcli-nombre">Nombre</Label>
            <Input id="edcli-nombre" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edcli-telefono">Teléfono</Label>
              <Input id="edcli-telefono" value={datos.clienteTelefono} onChange={(e) => actualizar("clienteTelefono", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edcli-dni">DNI / NIF</Label>
              <Input id="edcli-dni" value={datos.clienteDNI} onChange={(e) => actualizar("clienteDNI", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edcli-email">Email</Label>
            <Input id="edcli-email" type="email" value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edcli-direccion">Dirección</Label>
            <Input id="edcli-direccion" value={datos.clienteDireccion} onChange={(e) => actualizar("clienteDireccion", e.target.value)} />
          </div>

          <label className="flex items-center gap-2 pt-1 text-sm">
            <Checkbox checked={datos.reenviarEmail} onCheckedChange={(v) => actualizar("reenviarEmail", v === true)} />
            Reenviar el correo de confirmación del alquiler a este email
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
