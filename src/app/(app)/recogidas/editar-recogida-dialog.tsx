"use client";

import { useEffect, useState } from "react";
import { Truck, Calendar, Clock, Call, Sms, Location, DocumentText, Tag, Personalcard } from "@/lib/icons";
import type { Icon } from "@/lib/icons";
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

function Fila({ icono: Icono, valor }: { icono: Icon; valor: string }) {
  if (!valor) return null;
  return (
    <p className="flex items-start gap-2 text-sm">
      <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 wrap-break-word">{valor}</span>
    </p>
  );
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
  const [datos, setDatos] = useState<DatosEditarRecogida | null>(null);
  const [enviando, setEnviando] = useState(false);

  // El useState inicial solo captura `recogida` en el primer render de
  // este componente (que se monta una sola vez en la página, con
  // recogida=null) — sin este efecto, `datos` se quedaba null para
  // siempre y el cuerpo del diálogo no llegaba a pintar nada (bug real
  // reportado: el modal se abría vacío). Se sincroniza cada vez que
  // cambia el evento seleccionado, no solo al abrir.
  useEffect(() => {
    if (recogida) setDatos(desde(recogida));
  }, [recogida]);

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
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5" /> {recogida?.cliente || recogida?.asunto || "Recogida"}
          </DialogTitle>
        </DialogHeader>

        {datos && recogida && (
          <div className="space-y-4">
            <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
              <span
                className={`mb-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                  recogida.tipo === "cita_tienda" ? "bg-violet-500/10 text-violet-600" : "bg-sky-500/10 text-sky-600"
                }`}
              >
                {recogida.tipo === "cita_tienda" ? "Cita en tienda" : "Recogida a domicilio"}
              </span>
              <Fila icono={Calendar} valor={recogida.fecha ? new Date(recogida.fecha).toLocaleDateString("es-ES") : ""} />
              <Fila icono={Clock} valor={recogida.hora} />
              <Fila icono={DocumentText} valor={recogida.asunto} />
              <Fila icono={Call} valor={recogida.telefono} />
              <Fila icono={Sms} valor={recogida.email} />
              <Fila icono={Location} valor={recogida.direccion} />
              <Fila icono={Personalcard} valor={recogida.dni} />
              {recogida.notas && <Fila icono={Tag} valor={recogida.notas} />}
            </div>

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
