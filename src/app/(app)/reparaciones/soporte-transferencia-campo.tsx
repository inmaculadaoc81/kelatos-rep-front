"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SoporteTransferencia, TransferenciaCandidata } from "@/lib/soporte-transferencia";

function euros(n: number | null): string {
  return n === null || n === undefined ? "—" : `${Number(n).toFixed(2)} €`;
}

/** Soporte de la transferencia en el formulario de una venta o un alquiler: subir el comprobante o asociar una transferencia ya registrada. */
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

  return (
    <div className="space-y-1.5 rounded-md border border-dashed bg-muted/30 p-2">
      <Label className="text-xs text-muted-foreground">Soporte de la transferencia (opcional)</Label>
      <Input
        type="file"
        accept="image/*,.pdf"
        disabled={disabled}
        onChange={(e) => onChange({ archivo: e.target.files?.[0] ?? null, movimientoId: null })}
      />
      <p className="text-[11px] text-muted-foreground">O asocia una transferencia que ya está en el dashboard:</p>
      <select
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        disabled={disabled || candidatas === null}
        value={value.movimientoId ?? ""}
        onChange={(e) => onChange({ archivo: null, movimientoId: e.target.value ? Number(e.target.value) : null })}
        aria-label="Transferencia ya registrada"
      >
        <option value="">{candidatas === null ? "Cargando…" : "— Ninguna —"}</option>
        {(candidatas ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            {euros(t.monto)} · {t.fecha_valor || "s/f"} · {t.remitente || "sin remitente"}
            {t.banco ? ` · ${t.banco}` : ""} · {t.estado === "Conciliada" ? "conciliada" : "pendiente"}
          </option>
        ))}
      </select>
    </div>
  );
}
