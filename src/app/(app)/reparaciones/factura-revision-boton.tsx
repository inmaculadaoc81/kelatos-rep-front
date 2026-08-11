"use client";

import { useState } from "react";
import { Receipt } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";
import { FacturaRevisionDialog } from "./factura-revision-dialog";

const ENTREGA_CERRADA = ["ENTREGADO", "ENVIO", "RECICLAJE"];

/**
 * Reproduce btnMarcarRevision del original: outline "Marcar Revisión"
 * mientras no está pagada, o sólido verde "Factura Revisión" (modo ver)
 * una vez generada — oculto solo cuando la entrega ya está cerrada.
 */
export function FacturaRevisionBoton({
  detalle,
  onActualizado,
}: {
  detalle: ReparacionDetalle;
  onActualizado: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  if (ENTREGA_CERRADA.includes(detalle.estadoEntrega)) return null;

  const yaGenerada = !!(detalle.numeroFacturaRevision || detalle.urlFacturaRevision);

  return (
    <>
      <Button
        size="sm"
        variant={yaGenerada ? "default" : "outline"}
        className={`gap-1.5 ${yaGenerada ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
        onClick={() => setAbierto(true)}
      >
        <Receipt className="size-3.5" /> {yaGenerada ? "Factura Revisión" : "Marcar Revisión"}
      </Button>
      <FacturaRevisionDialog detalle={detalle} open={abierto} onOpenChange={setAbierto} onGenerada={onActualizado} />
    </>
  );
}
