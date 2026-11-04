"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SoporteTransferencia, TransferenciaCandidata } from "@/lib/soporte-transferencia";

const NINGUNA = "ninguna";

function euros(n: number | null): string {
  return n === null || n === undefined ? "—" : `${Number(n).toFixed(2)} €`;
}

function etiquetaDe(t: TransferenciaCandidata): string {
  return [euros(t.monto), t.fecha_valor || "s/f", t.remitente || "sin remitente", t.banco, t.estado === "Conciliada" ? "conciliada" : "pendiente"].filter(Boolean).join(" · ");
}

/**
 * Soporte de la transferencia en el formulario de una venta o un alquiler (ocupa todo el ancho, debajo de la forma de pago): subir el
 * comprobante del cliente o asociar una transferencia que ya está en el dashboard. Elegir una cosa quita la otra.
 */
export function SoporteTransferenciaCampo({
  value,
  onChange,
  disabled,
}: {
  value: SoporteTransferencia;
  onChange: (v: SoporteTransferencia) => void;
  disabled?: boolean;
}) {
  const [candidatas, setCandidatas] = useState<TransferenciaCandidata[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/comprobantes-transferencia/candidatas")
      .then((r) => r.json())
      .then((d) => vivo && setCandidatas(d.ok ? d.transferencias : []))
      .catch(() => vivo && setCandidatas([]));
    return () => {
      vivo = false;
    };
  }, []);

  const elegida = value.movimientoId === null ? NINGUNA : String(value.movimientoId);

  return (
    <div className="space-y-2 rounded-lg border border-dashed bg-card p-3">
      <p className="text-xs font-semibold text-muted-foreground">Soporte de la transferencia (opcional)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Subir el comprobante del cliente</Label>
          <Input
            key={value.archivo ? "con-archivo" : "sin-archivo"}
            type="file"
            accept="image/*,.pdf"
            disabled={disabled}
            onChange={(e) => onChange({ archivo: e.target.files?.[0] ?? null, movimientoId: null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">O asociar una transferencia que ya está en el dashboard</Label>
          <Select
            value={elegida}
            onValueChange={(v) => onChange({ archivo: null, movimientoId: !v || v === NINGUNA ? null : Number(v) })}
            disabled={disabled || candidatas === null}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => {
                  if (candidatas === null) return "Cargando…";
                  if (!v || v === NINGUNA) return "— Ninguna —";
                  const t = candidatas.find((x) => String(x.id) === v);
                  return t ? etiquetaDe(t) : "— Ninguna —";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NINGUNA}>— Ninguna —</SelectItem>
              {(candidatas ?? []).map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {etiquetaDe(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
