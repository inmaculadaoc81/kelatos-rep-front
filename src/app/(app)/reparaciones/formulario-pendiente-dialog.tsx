"use client";

import { useState } from "react";
import { CloseCircle } from "@/lib/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Reparacion } from "@/lib/reparaciones";

/** Rechazo de una solicitud "Formulario Pendiente" — la confirmación (aceptar la solicitud) vive en ReparacionSheet, que reproduce el mismo panel que "Nueva Reparación" (igual que en el original, un único modal reutilizado). */
export function RechazarFormularioDialog({
  reparacion,
  onOpenChange,
  onResuelto,
}: {
  reparacion: Reparacion | null;
  onOpenChange: (open: boolean) => void;
  onResuelto: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function rechazar() {
    if (!reparacion) return;
    if (!motivo.trim()) return toast.error("El motivo del rechazo es obligatorio");

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${reparacion.resguardo}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Formulario ${reparacion.resguardo} rechazado`);
      setMotivo("");
      onOpenChange(false);
      onResuelto();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={reparacion !== null} onOpenChange={(open) => !enviando && onOpenChange(open)}>
      <DialogContent showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloseCircle className="size-5" /> Rechazar formulario #{reparacion?.resguardo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="motivo">Motivo del rechazo *</Label>
          <Textarea id="motivo" rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explica por qué se rechaza esta solicitud..." />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={rechazar} disabled={enviando} variant="destructive" className="gap-1.5">
            <CloseCircle className="size-4" /> {enviando ? "Rechazando..." : "Rechazar formulario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
