"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ClipboardTick } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { EmpleadoTareas } from "@/app/api/tareas/empleados/route";
import { ETIQUETA_PRIORIDAD, type PrioridadTarea, type Tarea } from "@/lib/tareas";
import { EtiquetasInput } from "./etiquetas-input";

export function NuevaTareaDialog({
  open, onOpenChange, empleados, onCreada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleados: EmpleadoTareas[];
  onCreada: (tarea: Tarea) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [asignadoA, setAsignadoA] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadTarea>("media");
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [esDiaria, setEsDiaria] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [enviando, setEnviando] = useState(false);

  function limpiar() {
    setTitulo(""); setDescripcion(""); setAsignadoA(""); setPrioridad("media"); setEtiquetas([]); setEsDiaria(false); setFechaInicio(new Date().toISOString().slice(0, 10));
  }

  async function crear() {
    if (!titulo.trim()) return toast.error("El título es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim() || undefined, asignadoA: asignadoA || undefined, prioridad, etiquetas, esDiaria, fechaInicio }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Tarea creada");
      onCreada(data.tarea as Tarea);
      limpiar();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <ClipboardTick className="size-4.5" /> Nueva tarea
        </DialogTitle>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tTitulo">Título *</Label>
            <Input id="tTitulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Revisar stock de pantallas" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tDescripcion">Descripción</Label>
            <Textarea id="tDescripcion" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Asignar a</Label>
              <Select value={asignadoA || "nadie"} onValueChange={(v) => setAsignadoA(!v || v === "nadie" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => (v && v !== "nadie" ? empleados.find((e) => e.email === v)?.nombre || v : "Sin asignar")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nadie">Sin asignar</SelectItem>
                  {empleados.map((e) => (
                    <SelectItem key={e.id} value={e.email || e.nombre}>{e.nombre}{e.trabajaRemoto ? " · Remoto" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={prioridad} onValueChange={(v) => v && setPrioridad(v as PrioridadTarea)}>
                <SelectTrigger className="w-full"><SelectValue>{(v: string) => ETIQUETA_PRIORIDAD[v as PrioridadTarea] || v}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tFechaInicio">Fecha de inicio</Label>
            <Input id="tFechaInicio" type="date" className="w-full sm:w-auto" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Etiquetas</Label>
            <EtiquetasInput valor={etiquetas} onChange={setEtiquetas} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={esDiaria} onCheckedChange={(c) => setEsDiaria(c === true)} />
            Tarea diaria (se repite cada día, sin fecha de fin — se marca "hecha" día a día)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={crear} disabled={enviando}>{enviando ? "Creando..." : "Crear tarea"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
