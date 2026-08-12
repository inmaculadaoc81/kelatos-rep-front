"use client";

import { useState } from "react";
import { Setting2, CloseCircle, Play } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Misma lista fija que TECNICOS_FINALIZAR (finalizar-dialog.tsx) — el
// original la hardcodea en el <select> del modal, no la saca de la lista
// general de empleados.
const TECNICOS = ["Iván", "Romer", "Daniela", "Repuesto"];

/**
 * Reproduce #modalIniciarReparacion (abrirModalIniciarReparacion/
 * confirmarIniciarReparacion) del original: asigna técnico y pasa el
 * estado a "En Reparación" (o a "Presupuesto Pendiente"/"Pieza Pendiente"
 * si el backend detecta que aún faltan pedidos, ver el 409 de
 * /flujo-inicial). Mismo endpoint que marcarComoGarantia
 * (accion:"iniciar_reparacion" en vez de "marcar_garantia").
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
  const [tecnico, setTecnico] = useState("");
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cerrar(o: boolean) {
    if (enviando) return;
    if (!o) { setTecnico(""); setObservacion(""); }
    onOpenChange(o);
  }

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
      setTecnico("");
      setObservacion("");
      onOpenChange(false);
      onIniciado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-emerald-600 px-4 py-3 text-white">
          <Setting2 className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Iniciar Reparación</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => cerrar(false)} disabled={enviando}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">Asigne el técnico responsable de realizar la reparación.</p>

          <div className="space-y-1.5">
            <Label>Técnico Responsable *</Label>
            <Select value={tecnico} onValueChange={(v) => setTecnico(v || "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione un técnico..." /></SelectTrigger>
              <SelectContent>
                {TECNICOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observaciones (opcional)</Label>
            <Textarea rows={2} placeholder="Notas adicionales..." value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-3">
          <Button variant="secondary" className="gap-1.5" onClick={() => cerrar(false)} disabled={enviando}>
            <CloseCircle className="size-3.5" /> Cancelar
          </Button>
          <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={confirmar} disabled={enviando}>
            <Play className="size-3.5" /> {enviando ? "Guardando..." : "Iniciar Reparación"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
