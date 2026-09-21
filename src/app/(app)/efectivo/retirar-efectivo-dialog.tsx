"use client";

import { useState } from "react";
import { MoneyRecive, MoneySend } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import { toast } from "sonner";

/** Valor para <input type="datetime-local"> (hora local del navegador). */
function ahoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function RetirarEfectivoDialog({
  open,
  onOpenChange,
  saldo,
  onRegistrada,
  modo = "retirada",
}: {
  /** "retirada" resta de la caja; "ingreso" suma efectivo que no viene de ningún
      documento (p. ej. el que ya había en el local). */
  modo?: "retirada" | "ingreso";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saldo: number;
  onRegistrada: () => void;
}) {
  const [importe, setImporte] = useState(0);
  const [fechaHora, setFechaHora] = useState(ahoraLocal);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Retirar más de lo que hay en caja pide una segunda confirmación, dentro
  // del propio modal (no un window.confirm del navegador).
  const [confirmaExceso, setConfirmaExceso] = useState(false);

  function reiniciar() {
    setImporte(0);
    setFechaHora(ahoraLocal());
    setMotivo("");
    setConfirmaExceso(false);
  }

  const esIngreso = modo === "ingreso";
  const excede = !esIngreso && importe > saldo;

  async function registrar() {
    if (!(importe > 0)) return toast.error("Indica el importe que se retira");
    if (!fechaHora) return toast.error(esIngreso ? "Indica cuándo se añadió" : "Indica cuándo se retiró");
    if (esIngreso && !motivo.trim()) return toast.error("Explica de dónde sale este efectivo");
    if (excede && !confirmaExceso) {
      setConfirmaExceso(true);
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/efectivo/retiradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: modo, importe, motivo: motivo.trim(), fechaHora: new Date(fechaHora).toISOString() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(esIngreso ? "Efectivo añadido" : "Retirada registrada");
      reiniciar();
      onOpenChange(false);
      onRegistrada();
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
            {esIngreso ? <MoneyRecive className="size-5" /> : <MoneySend className="size-5" />} {esIngreso ? "Añadir efectivo" : "Retirar efectivo"}
          </DialogTitle>
          <DialogDescription>
            {esIngreso
              ? "Registra efectivo que entra en caja sin ticket ni factura, por ejemplo el que ya había en el local. No modifica ningún documento: solo suma al saldo de esta vista."
              : "Registra una salida de efectivo de caja. No modifica ningún ticket ni factura: solo resta del saldo de esta vista."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="importeRetirada">Importe (€)</Label>
              <DecimalInput
                id="importeRetirada"
                placeholder="0.00"
                value={importe}
                onChange={(n) => {
                  setImporte(n);
                  setConfirmaExceso(false);
                }}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaRetirada">Fecha y hora</Label>
              <Input id="fechaRetirada" type="datetime-local" value={fechaHora} max={ahoraLocal()} onChange={(e) => setFechaHora(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivoRetirada">{esIngreso ? "Motivo *" : "Motivo (opcional)"}</Label>
            <Input
              id="motivoRetirada"
              placeholder={esIngreso ? "Efectivo que ya había en el local…" : "Ingreso en banco, pago a proveedor…"}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          {confirmaExceso && excede && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              Vas a retirar más de lo que hay en caja ({saldo.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}). El saldo quedará en negativo.
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Saldo actual en caja: <span className="font-medium text-foreground">{saldo.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={enviando} onClick={registrar}>
            {enviando ? "Registrando…" : confirmaExceso && excede ? "Retirar igualmente" : esIngreso ? "Añadir efectivo" : "Registrar retirada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
