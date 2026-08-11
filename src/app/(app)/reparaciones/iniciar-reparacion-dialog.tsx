"use client";

import { useEffect, useState } from "react";
import { Setting2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Empleado } from "@/app/api/empleados/route";

/**
 * Reproduce abrirModalIniciarReparacion()/confirmarIniciarReparacion() del
 * original: asigna técnico y pasa el estado a "En Reparación" (o a
 * "Presupuesto Pendiente"/"Pieza Pendiente" si el backend detecta que aún
 * faltan pedidos, ver el 409 de /flujo-inicial). Mismo endpoint que
 * marcarComoGarantia (accion:"iniciar_reparacion" en vez de
 * "marcar_garantia").
 */
export function IniciarReparacionDialog({
  resguardo,
  open,
  onOpenChange,
  onIniciado,
}: {
  resguardo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIniciado: () => void;
}) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [tecnico, setTecnico] = useState("");
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/empleados")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setEmpleados(d.empleados); });
  }, [open]);

  async function confirmar() {
    if (!tecnico) return toast.error("Debe seleccionar un técnico responsable");
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/flujo-inicial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "iniciar_reparacion", datos: { tecnico, observacion: observacion.trim() } }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Reparación iniciada. Técnico: ${tecnico}`);
      onOpenChange(false);
      setTecnico("");
      setObservacion("");
      onIniciado();
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
            <Setting2 className="size-5" /> Iniciar reparación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Técnico responsable *</Label>
            <Select value={tecnico} onValueChange={(v) => setTecnico(v || "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.empleadoId} value={e.nombre}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observación (opcional)</Label>
            <Textarea rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando ? "Guardando..." : "Iniciar reparación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
