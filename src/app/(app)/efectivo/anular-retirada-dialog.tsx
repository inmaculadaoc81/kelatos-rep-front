"use client";

import { useState } from "react";
import { CloseCircle } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { MovimientoEfectivo } from "@/lib/efectivo";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

/** Anula (no borra) una retirada registrada por error: queda en la lista
    como "Anulada", con su motivo, y deja de restar del saldo. */
export function AnularRetiradaDialog({
  retirada,
  onOpenChange,
  onAnulada,
}: {
  retirada: MovimientoEfectivo | null;
  onOpenChange: (open: boolean) => void;
  onAnulada: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cerrar(open: boolean) {
    if (enviando) return;
    if (!open) setMotivo("");
    onOpenChange(open);
  }

  async function anular() {
    if (!retirada) return;
    if (!motivo.trim()) return toast.error("El motivo de la anulación es obligatorio");
    setEnviando(true);
    try {
      const res = await fetch(`/api/efectivo/retiradas/${retirada.retiradaId}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Retirada anulada");
      setMotivo("");
      onOpenChange(false);
      onAnulada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={retirada !== null} onOpenChange={cerrar}>
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <CloseCircle className="size-5" /> Anular retirada
          </DialogTitle>
          <DialogDescription>
            La retirada dejará de restar de la caja, pero se conserva en la lista como &quot;Anulada&quot; junto con el motivo.
          </DialogDescription>
        </DialogHeader>

        {retirada && (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Importe</span>
                <span className="font-semibold tabular-nums">{euros(Math.abs(retirada.importe))}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Concepto</span>
                <span className="truncate text-right">{retirada.concepto}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivoAnulacion">Motivo de la anulación *</Label>
              <Input
                id="motivoAnulacion"
                autoFocus
                maxLength={500}
                placeholder="Se registró por error, importe incorrecto…"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") anular();
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => cerrar(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={enviando || !motivo.trim()} onClick={anular}>
            {enviando ? "Anulando…" : "Anular retirada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
