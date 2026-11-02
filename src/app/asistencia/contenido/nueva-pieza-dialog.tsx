"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video } from "@/lib/icons";
import { ESTADOS, REDES_ELEGIBLES, TIPOS_ELEGIBLES, etiquetaDe, type EstadoPieza, type Marca, type RedSocial, type TipoPieza } from "@/lib/contenido";
import { CampoEnlaceVideo, SelectAsignado, SelectMarca, SIN_VALOR, useEmpleados } from "./campos-pieza";

export function NuevaPiezaDialog({
  open, onOpenChange, onCreada, fechaInicial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreada: (id: number) => void;
  /** Día (AAAA-MM-DD) con el que se abre el formulario, p. ej. al pulsar un hueco del calendario. */
  fechaInicial?: string;
}) {
  const empleados = useEmpleados(open);
  const [titulo, setTitulo] = useState("");
  const [estado, setEstado] = useState<EstadoPieza>("pendiente");
  const [tipo, setTipo] = useState<TipoPieza | "">("");
  const [red, setRed] = useState<RedSocial | "">("");
  const [marca, setMarca] = useState<Marca | "">("");
  const [asignadoId, setAsignadoId] = useState("");
  const [programada, setProgramada] = useState("");
  const [enlaceVideo, setEnlaceVideo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) setProgramada(fechaInicial ? `${fechaInicial}T09:00` : "");
  }, [open, fechaInicial]);

  function limpiar() {
    setTitulo(""); setEstado("pendiente"); setTipo(""); setRed(""); setMarca(""); setAsignadoId(""); setProgramada(""); setEnlaceVideo("");
  }

  async function crear() {
    if (!titulo.trim()) return toast.error("El título es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch("/api/asistencia/kiosk/contenido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          estado,
          tipo: tipo || null,
          red_social: red || null,
          marca: marca || null,
          asignado_id: asignadoId ? Number(asignadoId) : null,
          programada_para: programada ? new Date(programada).toISOString() : null,
          enlace_video: enlaceVideo.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Pieza creada");
      limpiar();
      onCreada(data.pieza.id as number);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogTitle className="flex items-center gap-2"><Video className="size-4.5" /> Nueva pieza</DialogTitle>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="npTitulo">Título *</Label>
            <Input id="npTitulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectAsignado id="npAsignado" valor={asignadoId} onChange={setAsignadoId} empleados={empleados} />
            <SelectMarca id="npMarca" valor={marca} onChange={setMarca} />
            <div className="space-y-1.5">
              <Label htmlFor="npTipo">Tipo</Label>
              <Select value={tipo || SIN_VALOR} onValueChange={(v) => setTipo((v && v !== SIN_VALOR ? v : "") as TipoPieza | "")}>
                <SelectTrigger id="npTipo" className="w-full">
                  <SelectValue>{(v: string) => (v === SIN_VALOR ? "—" : etiquetaDe(TIPOS_ELEGIBLES, v as TipoPieza))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>—</SelectItem>
                  {TIPOS_ELEGIBLES.map((x) => <SelectItem key={x.valor} value={x.valor}>{x.etiqueta}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="npRed">Red social</Label>
              <Select value={red || SIN_VALOR} onValueChange={(v) => setRed((v && v !== SIN_VALOR ? v : "") as RedSocial | "")}>
                <SelectTrigger id="npRed" className="w-full">
                  <SelectValue>{(v: string) => (v === SIN_VALOR ? "—" : etiquetaDe(REDES_ELEGIBLES, v as RedSocial))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>—</SelectItem>
                  {REDES_ELEGIBLES.map((x) => <SelectItem key={x.valor} value={x.valor}>{x.etiqueta}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="npProgramada">Fecha y hora de programación</Label>
              <Input id="npProgramada" type="datetime-local" value={programada} onChange={(e) => setProgramada(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="npEstado">Estado</Label>
              <Select value={estado} onValueChange={(v) => v && setEstado(v as EstadoPieza)}>
                <SelectTrigger id="npEstado" className="w-full">
                  <SelectValue>{(v: string) => etiquetaDe(ESTADOS, v as EstadoPieza)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((x) => <SelectItem key={x.valor} value={x.valor}>{x.etiqueta}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CampoEnlaceVideo id="npVideo" valor={enlaceVideo} onChange={setEnlaceVideo} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={crear} disabled={enviando}>{enviando ? "Creando…" : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
