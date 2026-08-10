"use client";

import { useState } from "react";
import { AddCircle } from "@/lib/icons";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DatosNuevaReparacion, EstadoInicialSimple, TipoRecepcion } from "@/lib/reparacion-alta";

const VACIO: DatosNuevaReparacion = {
  fechaRecepcion: new Date().toISOString().slice(0, 10),
  clienteNombre: "",
  clienteTelefono: "",
  clienteEmail: "",
  dniCif: "",
  direccionEnvio: "",
  equipoModelo: "",
  sintoma: "",
  estado: "Presupuesto Pendiente",
  tipoRecepcion: "LOCAL",
  entregaMensajeria: false,
  revisionPagada: false,
};

export function NuevaReparacionDrawer({ onCreada }: { onCreada: () => void }) {
  const [open, setOpen] = useState(false);
  const [datos, setDatos] = useState<DatosNuevaReparacion>(VACIO);
  const [guardando, setGuardando] = useState(false);

  function actualizar<K extends keyof DatosNuevaReparacion>(campo: K, valor: DatosNuevaReparacion[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.clienteNombre.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!datos.equipoModelo.trim()) return toast.error("El modelo del equipo es obligatorio");
    if (!datos.sintoma.trim()) return toast.error("El síntoma es obligatorio");

    setGuardando(true);
    try {
      const res = await fetch("/api/reparaciones/altas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");

      toast.success(`Reparación ${data.resguardo} registrada`);
      setDatos(VACIO);
      setOpen(false);
      onCreada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} swipeDirection="right">
      <DrawerTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        <AddCircle className="size-4" /> Nueva Reparación
      </DrawerTrigger>
      {/* Panel lateral: más ancho que el 24rem por defecto, porque el
          formulario es de dos columnas. */}
      <DrawerContent className="sm:[--drawer-content-width:38rem]">
        <DrawerHeader>
          <DrawerTitle>Nueva Reparación — Recepción</DrawerTitle>
          <DrawerDescription>Datos del parte de recepción</DrawerDescription>
        </DrawerHeader>

        {/* DrawerContent ya es flex-col con overflow oculto: el cuerpo es
            quien scrollea, y la cabecera y el pie quedan fijos. */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="space-y-5">
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              El nº de resguardo se asigna automáticamente al guardar (no se puede reservar ni previsualizar).
            </p>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Datos del parte</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fechaRecepcion">Fecha de recepción *</Label>
                  <Input
                    id="fechaRecepcion"
                    type="date"
                    value={datos.fechaRecepcion}
                    onChange={(e) => actualizar("fechaRecepcion", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Datos del cliente</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="clienteNombre">Nombre completo *</Label>
                  <Input id="clienteNombre" value={datos.clienteNombre} onChange={(e) => actualizar("clienteNombre", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clienteTelefono">Teléfono</Label>
                  <Input id="clienteTelefono" value={datos.clienteTelefono} onChange={(e) => actualizar("clienteTelefono", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clienteEmail">Email</Label>
                  <Input id="clienteEmail" type="email" value={datos.clienteEmail} onChange={(e) => actualizar("clienteEmail", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dniCif">DNI / CIF</Label>
                  <Input id="dniCif" value={datos.dniCif} onChange={(e) => actualizar("dniCif", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="direccionEnvio">Dirección</Label>
                  <Input id="direccionEnvio" value={datos.direccionEnvio} onChange={(e) => actualizar("direccionEnvio", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Datos del equipo</p>
              <div className="space-y-1.5">
                <Label htmlFor="equipoModelo">Modelo / Marca *</Label>
                <Input id="equipoModelo" value={datos.equipoModelo} onChange={(e) => actualizar("equipoModelo", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sintoma">Síntoma / Avería *</Label>
                <Textarea id="sintoma" rows={3} value={datos.sintoma} onChange={(e) => actualizar("sintoma", e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Tipo de recepción</p>
              <RadioGroup
                value={datos.tipoRecepcion}
                onValueChange={(v) => actualizar("tipoRecepcion", v as TipoRecepcion)}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="LOCAL" /> Cliente trajo al local
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="ENVIO" /> Recibido por envío
                </label>
              </RadioGroup>
              {datos.tipoRecepcion === "ENVIO" && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={datos.entregaMensajeria} onCheckedChange={(v) => actualizar("entregaMensajeria", v)} />
                  Devolución por mensajería
                </label>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Estado inicial</p>
              <RadioGroup
                value={datos.estado}
                onValueChange={(v) => actualizar("estado", v as EstadoInicialSimple)}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="Presupuesto Pendiente" /> Presupuesto Pendiente
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="Garantía" /> Garantía
                </label>
              </RadioGroup>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={datos.revisionPagada} onCheckedChange={(v) => actualizar("revisionPagada", v)} />
                Revisión pagada (20€)
              </label>
            </div>
          </div>
        </div>

        <DrawerFooter className="flex-row justify-end border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Registrando..." : "Registrar Recepción"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
