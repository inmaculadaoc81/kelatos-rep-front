"use client";

import { useState } from "react";
import { Monitor } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { DatosNuevoEquipo, TARIFAS_EQUIPO, TipoEquipo } from "@/lib/equipos";

const VACIO: DatosNuevoEquipo = {
  tipo: "normal",
  marca: "",
  modelo: "",
  serie: "",
  sistemaOperativo: "",
  caracteristicas: "",
  defectos: "",
  observaciones: "",
};

export function NuevoEquipoDialog({ onCreado }: { onCreado: () => void }) {
  const [open, setOpen] = useState(false);
  const [datos, setDatos] = useState<DatosNuevoEquipo>(VACIO);
  const [enviando, setEnviando] = useState(false);

  function actualizar<K extends keyof DatosNuevoEquipo>(campo: K, valor: DatosNuevoEquipo[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar() {
    if (!datos.marca.trim()) return toast.error("La marca es obligatoria");
    if (!datos.modelo.trim()) return toast.error("El modelo es obligatorio");

    setEnviando(true);
    try {
      const res = await fetch("/api/equipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Equipo ${data.equipo.id_equipo} creado`);
      setDatos(VACIO);
      setOpen(false);
      onCreado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  const tarifa = TARIFAS_EQUIPO[datos.tipo];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}>
        <Monitor className="size-4" /> Nuevo Equipo
      </DialogTrigger>
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle>Nuevo equipo de alquiler</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <RadioGroup value={datos.tipo} onValueChange={(v) => actualizar("tipo", v as TipoEquipo)} className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="normal" /> Normal
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="gamer" /> Gamer
            </label>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Tarifa: {tarifa.dia}€/día · {tarifa.semanal}€/semana · {tarifa.mensual}€/mes · Fianza {tarifa.fianza}€
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca *</Label>
              <Input id="marca" value={datos.marca} onChange={(e) => actualizar("marca", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input id="modelo" value={datos.modelo} onChange={(e) => actualizar("modelo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serie">Nº de serie</Label>
              <Input id="serie" value={datos.serie} onChange={(e) => actualizar("serie", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sistemaOperativo">Sistema operativo</Label>
              <Input id="sistemaOperativo" value={datos.sistemaOperativo} onChange={(e) => actualizar("sistemaOperativo", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caracteristicas">Características</Label>
            <Textarea id="caracteristicas" rows={2} value={datos.caracteristicas} onChange={(e) => actualizar("caracteristicas", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defectos">Defectos</Label>
            <Textarea id="defectos" rows={2} value={datos.defectos} onChange={(e) => actualizar("defectos", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacionesEquipo">Observaciones</Label>
            <Textarea id="observacionesEquipo" rows={2} value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Crear equipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
