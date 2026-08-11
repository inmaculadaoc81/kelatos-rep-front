"use client";

import { useState } from "react";
import { BoxRemove, ArrowRotateLeft, RotateLeft } from "@/lib/icons";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { DatosSinReparacionPieza } from "@/lib/reparacion-estados-especiales";

const ESTADOS_ORIGEN_SIN_PIEZA = ["Presupuesto Pendiente", "Presupuesto Enviado"];

const VACIO: DatosSinReparacionPieza = {
  tecnico: "",
  fecha: new Date().toISOString().slice(0, 10),
  motivoAdicional: "",
  marcarPresupuestosObsoletos: true,
};

export function EstadosEspecialesPanel({
  detalle,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  onActualizado: () => void;
}) {
  const [sinPiezaAbierto, setSinPiezaAbierto] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const confirmar = useConfirm();

  const puedeSinPieza = ESTADOS_ORIGEN_SIN_PIEZA.includes(detalle.estado);
  const puedeDeshacer = detalle.estado === "No tiene Reparación" && detalle.motivoSinReparacion.startsWith("NO_HAY_PIEZA");
  const puedeRevertirAbandono = detalle.estado === "Abandonado";

  if (!puedeSinPieza && !puedeDeshacer && !puedeRevertirAbandono) return null;

  async function ejecutar(accion: string, datosAccion: Record<string, unknown>, mensajeExito: string) {
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/estados-especiales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, datos: datosAccion }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(mensajeExito);
      setSinPiezaAbierto(false);
      setDatos(VACIO);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  function guardarSinPieza() {
    if (!datos.tecnico.trim()) return toast.error("El técnico es obligatorio");
    if (!datos.motivoAdicional.trim()) return toast.error("El motivo es obligatorio");
    ejecutar("sin_reparacion_pieza", { ...datos }, "Marcado como Sin Reparación por falta de pieza");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {puedeSinPieza && (
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => setSinPiezaAbierto(true)}>
          <BoxRemove className="size-3.5" /> Sin reparación por pieza
        </Button>
      )}
      {puedeDeshacer && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={enviando}
          onClick={async () => {
            const ok = await confirmar(
              '¿Deshacer "Sin Reparación"?\n\n' +
              "Esto restaurará el estado anterior de la reparación.\n" +
              "Los presupuestos marcados como obsoletos NO se modificarán automáticamente."
            );
            if (ok) ejecutar("deshacer_sin_reparacion", {}, "Estado anterior restaurado");
          }}
        >
          <ArrowRotateLeft className="size-3.5" /> Deshacer sin reparación
        </Button>
      )}
      {puedeRevertirAbandono && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={enviando}
          onClick={async () => {
            const ok = await confirmar("¿Revertir estado Abandonado?");
            if (ok) ejecutar("revertir_abandonado", {}, "Abandono revertido");
          }}
        >
          <RotateLeft className="size-3.5" /> Revertir abandonado
        </Button>
      )}

      <Dialog open={sinPiezaAbierto} onOpenChange={(o) => !enviando && setSinPiezaAbierto(o)}>
        <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BoxRemove className="size-5" /> Sin reparación por falta de pieza
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tecnicoSinPieza">Técnico *</Label>
              <Input id="tecnicoSinPieza" value={datos.tecnico} onChange={(e) => setDatos((p) => ({ ...p, tecnico: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaSinPieza">Fecha</Label>
              <Input id="fechaSinPieza" type="date" value={datos.fecha} onChange={(e) => setDatos((p) => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivoSinPieza">Motivo *</Label>
              <Textarea id="motivoSinPieza" rows={3} value={datos.motivoAdicional} onChange={(e) => setDatos((p) => ({ ...p, motivoAdicional: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={datos.marcarPresupuestosObsoletos}
                onCheckedChange={(v) => setDatos((p) => ({ ...p, marcarPresupuestosObsoletos: v === true }))}
              />
              Marcar presupuestos en borrador/pendiente como obsoletos
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSinPiezaAbierto(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={guardarSinPieza} disabled={enviando}>
              {enviando ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
