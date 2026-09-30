"use client";

import { useState } from "react";
import { Coin1 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import { toast } from "sonner";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

/** Valor para <input type="datetime-local"> (hora local del navegador). */
function ahoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/**
 * Conteo físico de caja: compara lo contado en el local contra lo que dice
 * el sistema ("En caja ahora", `saldo`) en el momento de contar. Nunca
 * mueve dinero — solo deja constancia de la comprobación y, si la hay, de
 * la diferencia. La diferencia se ve en vivo mientras se escribe el importe
 * contado, antes incluso de guardar nada.
 */
export function ContarEfectivoDialog({
  open,
  onOpenChange,
  saldo,
  onRegistrado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saldo: number;
  onRegistrado: () => void;
}) {
  const [importeContado, setImporteContado] = useState<number | null>(null);
  const [fechaHora, setFechaHora] = useState(ahoraLocal);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  function reiniciar() {
    setImporteContado(null);
    setFechaHora(ahoraLocal());
    setMotivo("");
  }

  const diferencia = importeContado === null ? null : Math.round((importeContado - saldo) * 100) / 100;

  async function registrar() {
    if (importeContado === null || importeContado < 0) return toast.error("Indica el efectivo contado en caja");
    if (!fechaHora) return toast.error("Indica cuándo se contó");

    setEnviando(true);
    try {
      const res = await fetch("/api/efectivo/conteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importeContado, saldoSistema: saldo, motivo: motivo.trim(), fechaHora: new Date(fechaHora).toISOString() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(diferencia === 0 ? "Conteo registrado: coincide con el sistema" : "Conteo registrado");
      reiniciar();
      onOpenChange(false);
      onRegistrado();
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
        if (!o) reiniciar();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coin1 className="size-5" /> Conteo de caja
          </DialogTitle>
          <DialogDescription>
            Cuenta el efectivo que hay ahora mismo en el local y compáralo con lo que dice el sistema. No modifica ningún ticket, factura ni el saldo de caja: solo deja constancia de la comprobación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Según el sistema hay ahora: <span className="font-medium text-foreground">{euros(saldo)}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="importeContado">Efectivo contado (€)</Label>
              <DecimalInput id="importeContado" placeholder="0.00" value={importeContado ?? 0} onChange={setImporteContado} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaConteo">Fecha y hora</Label>
              <Input id="fechaConteo" type="datetime-local" value={fechaHora} max={ahoraLocal()} onChange={(e) => setFechaHora(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivoConteo">Nota (opcional)</Label>
            <Input id="motivoConteo" placeholder="Cierre de caja, cambio de turno…" maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>

          {diferencia !== null && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                diferencia === 0
                  ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {diferencia === 0
                ? "Coincide con el sistema: no hay diferencia."
                : diferencia > 0
                  ? `Sobran ${euros(diferencia)} respecto al sistema.`
                  : `Faltan ${euros(Math.abs(diferencia))} respecto al sistema.`}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={enviando} onClick={registrar}>
            {enviando ? "Registrando…" : "Registrar conteo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
