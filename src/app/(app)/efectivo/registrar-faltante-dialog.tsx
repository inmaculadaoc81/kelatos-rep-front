"use client";

import { useState } from "react";
import { Warning2 } from "@/lib/icons";
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

/**
 * Diferencia de caja descubierta al contar el efectivo físico: menos dinero
 * del que dice el sistema. A diferencia de un "Conteo" (que solo compara y
 * deja constancia, sin tocar el saldo — ver contar-efectivo-dialog.tsx),
 * esto SÍ resta de verdad del saldo de Efectivo, para que vuelva a cuadrar
 * con lo que hay físicamente en caja. Mismo mecanismo que una retirada
 * (POST /v1/efectivo/retiradas con tipo="faltante"), solo que con su propia
 * etiqueta para no mezclarlo con salidas de caja intencionadas. Petición
 * del usuario, 2026-10-12: "un botón... para que el administrador añada,
 * después de actualizar la caja, la nueva cifra... resta el faltante y así
 * queda exacto".
 */
export function RegistrarFaltanteDialog({
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
  const [importe, setImporte] = useState(0);
  const [fechaHora, setFechaHora] = useState(ahoraLocal);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  function reiniciar() {
    setImporte(0);
    setFechaHora(ahoraLocal());
    setMotivo("");
  }

  async function registrar() {
    if (!(importe > 0)) return toast.error("Indica cuánto dinero falta");
    if (!fechaHora) return toast.error("Indica cuándo se detectó");

    setEnviando(true);
    try {
      const res = await fetch("/api/efectivo/retiradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "faltante", importe, motivo: motivo.trim(), fechaHora: new Date(fechaHora).toISOString() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Faltante registrado");
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
            <Warning2 className="size-5 text-destructive" /> Dinero faltante
          </DialogTitle>
          <DialogDescription>
            Registra una diferencia de caja (menos dinero del que hay según el sistema). Se resta del saldo para que quede exacto con lo contado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="importeFaltante">Importe que falta (€)</Label>
              <DecimalInput id="importeFaltante" placeholder="0.00" value={importe} onChange={setImporte} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaFaltante">Fecha y hora</Label>
              <Input id="fechaFaltante" type="datetime-local" value={fechaHora} max={ahoraLocal()} onChange={(e) => setFechaHora(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivoFaltante">Motivo (opcional)</Label>
            <Input
              id="motivoFaltante"
              placeholder="Diferencia al contar la caja…"
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Saldo actual en caja: <span className="font-medium text-foreground">{saldo.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={enviando} onClick={registrar}>
            {enviando ? "Registrando…" : "Registrar faltante"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
