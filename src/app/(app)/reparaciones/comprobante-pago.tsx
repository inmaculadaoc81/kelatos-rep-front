"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { InfoCircle } from "@/lib/icons";
import { BANCOS } from "@/lib/bancos";
import type { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { ComprobanteTransferenciaBoton, type ComprobanteTransferencia } from "./comprobante-transferencia-boton";
import type { ValorFormaPago } from "./selector-forma-pago";

/** «bbva» / «BBVA S.A.» → «BBVA»: devuelve el banco del selector que corresponde al del comprobante, o "" si no coincide con ninguno. */
function bancoDelSelector(banco: string | null | undefined): string {
  const t = (banco || "").trim().toLowerCase();
  if (!t) return "";
  if (t.includes("bilbao vizcaya")) return BANCOS.find((b) => b === "BBVA") ?? "";
  return BANCOS.find((b) => b.toLowerCase() === t) ?? BANCOS.find((b) => t.includes(b.toLowerCase()) || b.toLowerCase().includes(t)) ?? "";
}

/**
 * Cuando el pago de la reparación ya está comprobado y conciliado con el banco, la forma de pago se rellena sola: transferencia, el banco y la
 * referencia del comprobante. Solo completa lo que está vacío y nunca pisa lo que el empleado ya haya elegido (si eligió otra forma de pago, no se toca).
 */
export function rellenarDesdeComprobante(p: ValorFormaPago, c: ComprobanteTransferencia): ValorFormaPago {
  if (p.metodo && p.metodo !== "transferencia") return p;
  // Se prefiere el banco del ingreso real (el de la empresa, el que llega por tesorería); si no consta, el del comprobante que subió el empleado.
  const banco = bancoDelSelector(c.par?.banco) || bancoDelSelector(c.banco);
  const referencia = (c.referencia || c.par?.referencia || "").trim();
  return { ...p, metodo: "transferencia", banco: p.banco || banco, referencia: p.referencia || referencia };
}

/** Carga el comprobante de transferencia de la reparación al abrir el diálogo y, si está conciliado, rellena la forma de pago (una vez por comprobante). */
export function usePagoDesdeComprobante(resguardo: string, abierto: boolean, setPago: Dispatch<SetStateAction<ValorFormaPago>>) {
  const [comprobante, setComprobante] = useState<ComprobanteTransferencia | null>(null);
  const rellenado = useRef<number | null>(null);

  const recargar = useCallback(() => {
    fetch(`/api/reparaciones/${encodeURIComponent(resguardo)}/comprobante-transferencia`)
      .then((r) => r.json())
      .then((d) => {
        const c: ComprobanteTransferencia | null = d.ok ? d.comprobante : null;
        setComprobante(c);
        if (c && c.estado === "Conciliada" && rellenado.current !== c.id) {
          rellenado.current = c.id;
          setPago((p) => rellenarDesdeComprobante(p, c));
        }
      })
      .catch(() => {});
  }, [resguardo, setPago]);

  useEffect(() => {
    if (!abierto) {
      rellenado.current = null;
      return;
    }
    recargar();
  }, [abierto, recargar]);

  return { comprobante, recargar };
}

/** Botón «Pago realizado» + su ventana con los dos lados de la conciliación, dentro del propio cobro (sin salir ni cerrar la factura/ticket). */
export function BloqueComprobantePago({ detalle, comprobante, metodo, onActualizado }: {
  detalle: ReparacionDetalle;
  comprobante: ComprobanteTransferencia | null;
  metodo: string;
  onActualizado: () => void;
}) {
  if (!comprobante && metodo !== "transferencia") return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs">
      <span className="text-muted-foreground">Comprobante de la transferencia:</span>
      <ComprobanteTransferenciaBoton detalle={detalle} onActualizado={onActualizado} />
      {comprobante?.estado === "Conciliada" && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <InfoCircle className="size-3.5" /> Banco y referencia rellenados desde el comprobante conciliado; revisa que sean correctos.
        </span>
      )}
    </div>
  );
}
