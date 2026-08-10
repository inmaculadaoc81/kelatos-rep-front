"use client";

import { useState } from "react";
import { Truck } from "@/lib/icons";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Recogida, DatosEditarRecogida, EstadoRecogida, ESTADOS_RECOGIDA } from "@/lib/recogidas";

function desde(r: Recogida): DatosEditarRecogida {
  return { nuevoEstado: (r.estado as EstadoRecogida) || "Pedido de recogida", numeroSeguimiento: r.noSeguimiento, observaciones: r.observaciones };
}

export function EditarRecogidaDialog({
  recogida,
  open,
  onOpenChange,
  onGuardado,
}: {
  recogida: Recogida | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<DatosEditarRecogida | null>(recogida ? desde(recogida) : null);
  const [enviando, setEnviando] = useState(false);

  function actualizar<K extends keyof DatosEditarRecogida>(campo: K, valor: DatosEditarRecogida[K]) {
    setDatos((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function guardar() {
    if (!recogida || !datos) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/recogidas/${recogida.idEvento}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datos, actual: recogida }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Recogida actualizada");
      onOpenChange(false);
      onGuardado();
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
        if (o && recogida) setDatos(desde(recogida));
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5" /> {recogida?.cliente || "Recogida"}
          </DialogTitle>
        </DialogHeader>

        {datos && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {recogida?.direccion} · {recogida?.telefono}
            </p>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={datos.nuevoEstado} onValueChange={(v) => actualizar("nuevoEstado", (v || datos.nuevoEstado) as EstadoRecogida)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_RECOGIDA.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="noSeguimientoRec">Nº de seguimiento</Label>
              <Input id="noSeguimientoRec" value={datos.numeroSeguimiento} onChange={(e) => actualizar("numeroSeguimiento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacionesRec">Observaciones</Label>
              <Textarea id="observacionesRec" rows={3} value={datos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
