"use client";

import { useState } from "react";
import { ShieldTick } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";

export const ENTREGA_CERRADA = ["ENTREGADO", "ENVIO", "RECICLAJE"];

/**
 * Reproduce el botón "Marcar Garantía" de la fila "Estado Actual" del
 * original (btnMarcarGarantia) — visible salvo que ya sea garantía o la
 * entrega ya esté cerrada, igual que su lógica de visibilidad.
 */
export function MarcarGarantiaBoton({
  detalle,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  onActualizado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const confirmar = useConfirm();

  const yaEsGarantia = detalle.tipoIngreso === "GARANTIA";
  const entregada = ENTREGA_CERRADA.includes(detalle.estadoEntrega);
  if (yaEsGarantia || entregada) return null;

  async function marcar() {
    const ok = await confirmar("¿Marcar esta reparación como Garantía?\n\nLa factura pasará a ser opcional al momento de la entrega.");
    if (!ok) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/flujo-inicial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "marcar_garantia" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Reparación marcada como garantía");
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="gap-1.5" disabled={enviando} onClick={marcar}>
      <ShieldTick className="size-3.5" /> Marcar Garantía
    </Button>
  );
}
