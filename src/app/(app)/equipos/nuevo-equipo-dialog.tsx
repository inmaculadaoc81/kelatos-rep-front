"use client";

import { useState } from "react";
import { Monitor, Gameboy, Warning2 } from "@/lib/icons";
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
  enlaceRepuesto: "",
  imagenUrl: "",
};

/** Reproduce el botón de tipo de #modalNuevoEquipo (_neqActualizarTarifa) — activo cambia de contorno a color sólido. */
function BotonTipo({
  tipo,
  activo,
  seleccionado,
  onClick,
}: {
  tipo: TipoEquipo;
  activo: boolean;
  seleccionado: { icono: typeof Monitor; label: string; color: string };
  onClick: () => void;
}) {
  const Icono = seleccionado.icono;
  const tarifa = TARIFAS_EQUIPO[tipo];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md border-2 px-3 py-3 text-center transition-colors ${
        activo
          ? `${seleccionado.color} border-transparent text-white`
          : "border-input text-foreground hover:bg-muted/50"
      }`}
    >
      <Icono className="mx-auto size-6" />
      <p className="mt-1 text-sm font-semibold">{seleccionado.label}</p>
      <p className={`mt-0.5 text-xs ${activo ? "text-white/80" : "text-muted-foreground"}`}>
        {tarifa.dia} € / {tarifa.semanal} € / {tarifa.mensual} €
      </p>
    </button>
  );
}

/** Reproduce #modalNuevoEquipo (abrirModalNuevoEquipo/guardarNuevoEquipo) del original. */
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
    if (!datos.sistemaOperativo.trim()) return toast.error("El sistema operativo es obligatorio");
    if (!datos.imagenUrl.trim()) return toast.error("La imagen URL es obligatoria para el catálogo web");
    if (!/^https?:\/\/.+/.test(datos.imagenUrl.trim())) return toast.error("La Imagen URL debe ser una URL válida (debe empezar por https://)");
    if (!datos.caracteristicas.trim()) return toast.error("Las características son obligatorias");

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
    <Dialog open={open} onOpenChange={(o) => !enviando && setOpen(o)}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}>
        <Monitor className="size-4" /> Nuevo Equipo
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="size-5" /> Nuevo Equipo de Alquiler
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Tipo de equipo *</Label>
            <div className="flex gap-3">
              <BotonTipo
                tipo="normal"
                activo={datos.tipo === "normal"}
                seleccionado={{ icono: Monitor, label: "Normal / Estándar", color: "bg-emerald-600" }}
                onClick={() => actualizar("tipo", "normal")}
              />
              <BotonTipo
                tipo="gamer"
                activo={datos.tipo === "gamer"}
                seleccionado={{ icono: Gameboy, label: "Gamer", color: "bg-destructive" }}
                onClick={() => actualizar("tipo", "gamer")}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 rounded-md border bg-muted/30 p-2.5 text-center text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Día</p>
              <p className="font-semibold">{tarifa.dia} €</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Semana</p>
              <p className="font-semibold">{tarifa.semanal} €</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mes</p>
              <p className="font-semibold">{tarifa.mensual} €</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fianza</p>
              <p className="font-semibold">{tarifa.fianza} €</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca *</Label>
              <Input id="marca" placeholder="HP, Lenovo, ASUS…" value={datos.marca} onChange={(e) => actualizar("marca", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input id="modelo" placeholder="Pavilion 15, IdeaPad 3…" value={datos.modelo} onChange={(e) => actualizar("modelo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serie">Nº Serie</Label>
              <Input id="serie" placeholder="SN / IMEI" value={datos.serie} onChange={(e) => actualizar("serie", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sistemaOperativo">Sistema Operativo *</Label>
              <Input id="sistemaOperativo" placeholder="Windows 11 Home, Ubuntu 22.04…" value={datos.sistemaOperativo} onChange={(e) => actualizar("sistemaOperativo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enlaceRepuesto">Enlace repuesto</Label>
              <Input id="enlaceRepuesto" type="url" placeholder="https://…" value={datos.enlaceRepuesto} onChange={(e) => actualizar("enlaceRepuesto", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imagenUrl">Imagen URL *</Label>
            <Input id="imagenUrl" type="url" placeholder="https://… enlace directo a la imagen del equipo" value={datos.imagenUrl} onChange={(e) => actualizar("imagenUrl", e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Debe ser una URL válida que apunte directamente a la imagen. Esta imagen se utiliza en la <strong>página web del catálogo</strong> — no se muestra en el dashboard.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caracteristicas">Características *</Label>
            <Textarea id="caracteristicas" rows={3} placeholder="Describe el equipo: RAM, procesador, almacenamiento, tamaño de pantalla, resolución…" value={datos.caracteristicas} onChange={(e) => actualizar("caracteristicas", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="defectos">Defectos conocidos</Label>
              <Textarea id="defectos" rows={2} className="border-amber-500/50" placeholder="Ej. Bisagra izquierda floja, tecla Esc desgastada…" value={datos.defectos} onChange={(e) => actualizar("defectos", e.target.value)} />
              <p className="flex items-start gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Warning2 className="mt-0.5 size-3 shrink-0" /> Si se completa este campo, el equipo quedará deshabilitado en el catálogo hasta que se resuelva.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacionesEquipo">Observaciones internas</Label>
              <Textarea id="observacionesEquipo" rows={2} className="border-amber-500/50" placeholder="Notas internas del técnico…" value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
              <p className="flex items-start gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Warning2 className="mt-0.5 size-3 shrink-0" /> Si se completa este campo, el equipo quedará deshabilitado en el catálogo hasta que se resuelva.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar equipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
