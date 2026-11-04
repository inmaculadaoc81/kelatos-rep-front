"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SoporteTransferencia, TransferenciaCandidata } from "@/lib/soporte-transferencia";

const NINGUNA = "ninguna";

function euros(n: number | null): string {
  return n === null || n === undefined ? "—" : `${Number(n).toFixed(2)} €`;
}

function etiquetaDe(t: TransferenciaCandidata): string {
  return [`Nº ${t.id}`, euros(t.monto), t.fecha_valor || "s/f", t.remitente || "sin remitente", t.banco].filter(Boolean).join(" · ");
}

type Estado = { tipo: "vacio" } | { tipo: "comprobando" } | { tipo: "valida"; t: TransferenciaCandidata } | { tipo: "invalida"; motivo: string };

/**
 * Transferencia de una venta o de un alquiler (ocupa todo el ancho, debajo de la forma de pago). Para emitir la factura o el ticket hay que indicar el
 * NÚMERO de una transferencia confirmada por el banco (el justificante que sube Gisela por Telegram): se comprueba en vivo y también en el servidor.
 * Opcionalmente se puede adjuntar además el comprobante que envió el cliente.
 */
export function SoporteTransferenciaCampo({
  value,
  onChange,
  disabled,
  total,
}: {
  value: SoporteTransferencia;
  onChange: (v: SoporteTransferencia) => void;
  disabled?: boolean;
  /** Total del documento, solo para avisar si el importe de la transferencia no coincide. */
  total?: number;
}) {
  const [candidatas, setCandidatas] = useState<TransferenciaCandidata[] | null>(null);
  const [texto, setTexto] = useState(value.movimientoId ? String(value.movimientoId) : "");
  const [estado, setEstado] = useState<Estado>({ tipo: "vacio" });
  const valorRef = useRef(value);
  valorRef.current = value;

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

  // Comprobación en vivo del número escrito (con una pequeña espera para no preguntar en cada tecla).
  useEffect(() => {
    const n = Number(texto);
    if (!texto.trim() || !Number.isInteger(n) || n <= 0) {
      setEstado({ tipo: "vacio" });
      if (valorRef.current.movimientoId !== null) onChange({ ...valorRef.current, movimientoId: null });
      return;
    }
    setEstado({ tipo: "comprobando" });
    if (valorRef.current.movimientoId !== null) onChange({ ...valorRef.current, movimientoId: null });
    let vivo = true;
    const espera = setTimeout(() => {
      fetch(`/api/comprobantes-transferencia/validar/${n}`)
        .then((r) => r.json())
        .then((d) => {
          if (!vivo) return;
          if (d.ok && d.valida && d.transferencia) {
            setEstado({ tipo: "valida", t: d.transferencia as TransferenciaCandidata });
            onChange({ ...valorRef.current, movimientoId: n });
          } else {
            setEstado({ tipo: "invalida", motivo: d.motivo || d.error || "La transferencia indicada no es válida" });
          }
        })
        .catch(() => vivo && setEstado({ tipo: "invalida", motivo: "No se pudo comprobar la transferencia" }));
    }, 400);
    return () => {
      vivo = false;
      clearTimeout(espera);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const importeDistinto = estado.tipo === "valida" && total !== undefined && total > 0 && estado.t.monto !== null && Math.abs(Number(estado.t.monto) - total) > 0.01;

  return (
    <div className="space-y-2 rounded-lg border border-dashed bg-card p-3">
      <p className="text-xs font-semibold text-muted-foreground">Transferencia confirmada</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nº de transferencia *</Label>
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Nº que figura en Transferencias"
            value={texto}
            disabled={disabled}
            onChange={(e) => setTexto(e.target.value)}
            className={estado.tipo === "valida" ? "border-emerald-500" : estado.tipo === "invalida" || estado.tipo === "vacio" ? "border-amber-400" : ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">O elegir de las confirmadas sin vincular</Label>
          <Select
            value={value.movimientoId === null ? NINGUNA : String(value.movimientoId)}
            onValueChange={(v) => setTexto(!v || v === NINGUNA ? "" : v)}
            disabled={disabled || candidatas === null}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => {
                  if (candidatas === null) return "Cargando…";
                  if (!v || v === NINGUNA) return "— Ninguna —";
                  const t = candidatas.find((x) => String(x.id) === v);
                  return t ? etiquetaDe(t) : `Nº ${v}`;
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

      {estado.tipo === "vacio" && (
        <p className="text-[11px] text-amber-700">Para emitir el documento hace falta una transferencia confirmada por el banco (la que sube Gisela por Telegram).</p>
      )}
      {estado.tipo === "comprobando" && <p className="text-[11px] text-muted-foreground">Comprobando…</p>}
      {estado.tipo === "invalida" && <p className="text-[11px] font-medium text-red-600">{estado.motivo}</p>}
      {estado.tipo === "valida" && (
        <p className="text-[11px] font-medium text-emerald-700">
          ✓ Confirmada: {euros(estado.t.monto)} · {estado.t.fecha_valor || "s/f"} · {estado.t.remitente || "sin remitente"}
          {estado.t.banco ? ` · ${estado.t.banco}` : ""}
        </p>
      )}
      {importeDistinto && estado.tipo === "valida" && (
        <p className="text-[11px] font-medium text-amber-700">
          Ojo: la transferencia es de {euros(estado.t.monto)} y el total del documento es {euros(total ?? null)}.
        </p>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Adjuntar además el comprobante del cliente (opcional)</Label>
        <Input
          key={value.archivo ? "con-archivo" : "sin-archivo"}
          type="file"
          accept="image/*,.pdf"
          disabled={disabled}
          onChange={(e) => onChange({ ...valorRef.current, archivo: e.target.files?.[0] ?? null })}
        />
      </div>
    </div>
  );
}
