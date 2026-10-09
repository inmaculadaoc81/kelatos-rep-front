"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { TickCircle, Warning2 } from "@/lib/icons";
import { TarjetasImporteApi } from "@/lib/tarjetas";

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function etiquetaDia(dia: string): string {
  const txt = new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

interface Props {
  dia: string;
  hoy: string;
  vendidoSistema: number;
  importe: TarjetasImporteApi | null;
  onCambiado: () => void;
}

/** Una fila por día: lo que el sistema calcula vendido con tarjeta (física +
    virtual) ese día, y una celda editable para lo que el banco confirma —
    sin cuadre automático estricto (el importe del banco puede llegar días
    después, en lotes, con comisión descontada: lo gestiona el propio
    empleado, aquí solo se guarda lo que anote). Hermana de DiaTpvCard. */
export function DiaTarjetasCard({ dia, hoy, vendidoSistema, importe, onCambiado }: Props) {
  const [valor, setValor] = useState(Number(importe?.importe_banco) || 0);
  const [notas, setNotas] = useState(importe?.notas || "");
  const [guardando, setGuardando] = useState(false);

  const valorOriginal = Number(importe?.importe_banco) || 0;
  const notaOriginal = importe?.notas || "";
  const dirty = valor !== valorOriginal || notas !== notaOriginal || (!importe && valor > 0);

  async function guardar() {
    setGuardando(true);
    try {
      const res = await fetch("/api/tarjetas/importes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dia, importe: valor, notas }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Importe del banco guardado");
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b bg-muted px-4 py-2">
        <span className="text-sm font-semibold">
          {etiquetaDia(dia)} {dia === hoy && <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">Hoy</span>}
        </span>
        {vendidoSistema === 0 && !importe ? (
          <span className="text-xs text-muted-foreground">Sin ventas con tarjeta</span>
        ) : importe ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
            <TickCircle className="size-3.5" /> Anotado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
            <Warning2 className="size-3.5" /> Falta anotar el banco
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
        <span className="w-44 shrink-0 text-xs text-muted-foreground">
          Vendido con tarjeta: <span className="tabular-nums text-foreground">{euros(vendidoSistema)}</span>
        </span>
        <DecimalInput className="h-8 w-32" placeholder="Recibido en el banco" value={valor} onChange={setValor} />
        <Input className="h-8 flex-1" placeholder="Nota (opcional)" maxLength={500} value={notas} onChange={(e) => setNotas(e.target.value)} />
        <Button size="sm" variant={dirty ? "default" : "outline"} className="h-8 shrink-0" disabled={guardando || !dirty} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
