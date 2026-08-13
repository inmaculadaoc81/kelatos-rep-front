"use client";

import { useEffect, useState } from "react";
import { Profile, CloseCircle, Warning2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Reproduce el modal "Cliente se llevó el equipo" (modalClienteSeLoLlevo /
 * guardarClienteSeLoLlevo, Index.html) — solo aparece para reparaciones de
 * cintas en "Presupuesto Aceptado" como alternativa a "Iniciar
 * Digitalización" (ver abrirModalClienteSeLoLlevo, Index.html:12904):
 * marca el equipo como no presente en el local sin tocar el presupuesto ni
 * generar factura, para cuando el cliente prefiere llevárselo mientras
 * espera turno de digitalización.
 *
 * El campo de fecha se conserva igual que el original (con el mismo
 * min/max de "no futura") aunque, tal cual el original, no llega a
 * enviarse al backend — kelatosApiEjecutarSalidaSql solo persiste
 * "observaciones"; el evento de historial usa la fecha/hora reales del
 * servidor (now()), no la elegida en el picker.
 */
export function ClienteSeLoLlevoDialog({
  resguardo,
  open,
  onOpenChange,
  onConfirmado,
}: {
  resguardo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmado: () => void;
}) {
  const [fecha, setFecha] = useState(hoyIso());
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      setFecha(hoyIso());
      setObservaciones("");
    }
  }, [open]);

  async function confirmar() {
    if (!fecha) return toast.error("La fecha es obligatoria");
    if (fecha > hoyIso()) return toast.error("La fecha no puede ser futura");

    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${resguardo}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "cliente_se_lleva", observaciones }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Equipo marcado como recogido por el cliente");
      onOpenChange(false);
      onConfirmado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="max-w-sm gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
        <header className="flex items-center gap-2 rounded-t-xl bg-slate-600 px-4 py-2.5 text-white">
          <Profile className="size-4.5 shrink-0" />
          <DialogTitle className="text-sm font-semibold text-white">Cliente se llevó el equipo</DialogTitle>
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => !enviando && onOpenChange(false)}>
            <CloseCircle className="size-4" />
          </Button>
        </header>

        <div className="space-y-3 p-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-400">
            <Warning2 className="mt-0.5 size-3.5 shrink-0" />
            <span>El equipo se marcará como <strong>no presente en el local</strong>. El presupuesto sigue vigente y el flujo continúa con normalidad.</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sllFecha">Fecha en que se llevó el equipo *</Label>
            <Input id="sllFecha" type="date" value={fecha} max={hoyIso()} onChange={(e) => setFecha(e.target.value)} />
            <p className="text-xs text-muted-foreground">No se permiten fechas futuras.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sllObs">Observaciones (opcional)</Label>
            <Textarea id="sllObs" rows={2} placeholder="Ej: Cliente indicó que lo llevará a otro servicio técnico" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-2.5">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button size="sm" className="gap-1.5 bg-slate-700 text-white hover:bg-slate-800" onClick={confirmar} disabled={enviando}>
            <Profile className="size-3.5" /> {enviando ? "Guardando..." : "Confirmar recogida"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
