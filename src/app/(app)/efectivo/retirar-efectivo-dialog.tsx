"use client";

import { useEffect, useState } from "react";
import { MoneySend } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import { toast } from "sonner";
import { subirJustificante } from "./justificantes-efectivo";
import { apiC } from "@/lib/contabilidad";

/** Destino contable de una retirada (mismas categorías que Contabilidad → Efectivo y caja). El justificante es obligatorio salvo en el ingreso en banco, que se corrobora en la conciliación bancaria. */
const DESTINOS: { valor: string; etiqueta: string }[] = [
  { valor: "retirada_socio", etiqueta: "Retirada del socio" },
  { valor: "retirada_gasto", etiqueta: "Gasto menor" },
  { valor: "retirada_material", etiqueta: "Compra de material" },
  { valor: "deposito_banco", etiqueta: "Ingreso en un banco" },
];
const DESTINO_SIN_SOPORTE = "deposito_banco";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saldo: number;
  onRegistrada: () => void;
}) {
  const [importe, setImporte] = useState(0);
  const [fechaHora, setFechaHora] = useState(ahoraLocal);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [destino, setDestino] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [bancos, setBancos] = useState<{ id: number; nombre: string }[]>([]);
  // Retirar más de lo que hay en caja pide una segunda confirmación, dentro
  // del propio modal (no un window.confirm del navegador).
  const [confirmaExceso, setConfirmaExceso] = useState(false);

  function reiniciar() {
    setImporte(0);
    setFechaHora(ahoraLocal());
    setMotivo("");
    setArchivos([]);
    setDestino("");
    setBancoId("");
    setConfirmaExceso(false);
  }

  const excede = importe > saldo;
  const necesitaSoporte = destino !== "" && destino !== DESTINO_SIN_SOPORTE;

  // La lista de bancos solo hace falta si el destino es un ingreso en banco.
  useEffect(() => {
    if (destino !== DESTINO_SIN_SOPORTE || bancos.length > 0) return;
    apiC<{ bancos: { id: number; nombre: string }[] }>("efectivo")
      .then((d) => setBancos(d.bancos || []))
      .catch(() => setBancos([]));
  }, [destino, bancos.length]);

  async function registrar() {
    if (!(importe > 0)) return toast.error("Indica el importe que se retira");
    if (!fechaHora) return toast.error("Indica cuándo se retiró");
    if (!destino) return toast.error("Elige el destino contable de la retirada");
    if (destino === DESTINO_SIN_SOPORTE && !bancoId) return toast.error("Indica el banco del ingreso");
    if (necesitaSoporte && archivos.length === 0) return toast.error("Adjunta el justificante (factura o ticket de compra): es obligatorio para este destino");
    if (excede && !confirmaExceso) {
      setConfirmaExceso(true);
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/efectivo/retiradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importe, motivo: motivo.trim(), fechaHora: new Date(fechaHora).toISOString() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const retiradaId = Number(data.retirada?.id);
      let fallidos = 0;
      if (retiradaId > 0) {
        for (const f of archivos) {
          try {
            await subirJustificante(retiradaId, f);
          } catch {
            fallidos++;
          }
        }
      }
      let avisoDestino = false;
      if (retiradaId > 0) {
        try {
          await apiC(`efectivo/${retiradaId}`, { metodo: "PUT", cuerpo: { categoria: destino, banco_id: destino === DESTINO_SIN_SOPORTE ? Number(bancoId) : null } });
        } catch {
          avisoDestino = true;
        }
      }
      if (fallidos) toast.warning(`Retirada registrada, pero ${fallidos} justificante(s) no se pudieron subir: añádelos desde la lista (clip)`);
      else if (avisoDestino) toast.warning("Retirada registrada, pero no se pudo guardar el destino contable: elígelo en Contabilidad → Efectivo y caja");
      else toast.success(archivos.length ? "Retirada registrada con su justificante" : "Retirada registrada");
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
            <MoneySend className="size-5" /> Retirar efectivo
          </DialogTitle>
          <DialogDescription>
            Registra una salida de efectivo de caja. No modifica ningún ticket ni factura: solo resta del saldo de esta vista.
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
            <Label>Destino contable *</Label>
            <select
              className={`h-9 w-full rounded-md border bg-background px-2 text-sm ${destino ? "" : "border-amber-400"}`}
              value={destino}
              disabled={enviando}
              onChange={(e) => {
                setDestino(e.target.value);
                setBancoId("");
              }}
              aria-label="Destino contable"
            >
              <option value="">— Selecciona el destino —</option>
              {DESTINOS.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.etiqueta}
                </option>
              ))}
            </select>
          </div>
          {destino === DESTINO_SIN_SOPORTE && (
            <div className="space-y-1.5">
              <Label>Banco *</Label>
              <select
                className={`h-9 w-full rounded-md border bg-background px-2 text-sm ${bancoId ? "" : "border-amber-400"}`}
                value={bancoId}
                disabled={enviando}
                onChange={(e) => setBancoId(e.target.value)}
                aria-label="Banco del ingreso"
              >
                <option value="">— Selecciona el banco —</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="motivoRetirada">Motivo (opcional)</Label>
            <Input
              id="motivoRetirada"
              placeholder="Ingreso en banco, pago a proveedor…"
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="justificanteRetirada">{necesitaSoporte ? "Justificante (factura o ticket de compra) *" : "Justificante (factura o ticket de compra)"}</Label>
            <Input
              id="justificanteRetirada"
              type="file"
              multiple
              accept="application/pdf,image/*,.heic,.heif"
              onChange={(e) => setArchivos(Array.from(e.target.files || []))}
              className={necesitaSoporte && archivos.length === 0 ? "border-amber-400" : ""}
            />
            <p className="text-[11px] text-muted-foreground">
              {destino === DESTINO_SIN_SOPORTE
                ? "No hace falta: el ingreso en el banco se corrobora en la conciliación bancaria."
                : "Obligatorio para una retirada del socio, un gasto menor o una compra de material."}
            </p>
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
            {enviando ? "Registrando…" : confirmaExceso && excede ? "Retirar igualmente" : "Registrar retirada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
