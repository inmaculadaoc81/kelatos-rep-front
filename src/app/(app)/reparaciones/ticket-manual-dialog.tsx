"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ticket, Add, Trash, DocumentDownload } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";

interface LineaTicket {
  descripcion: string;
  cantidad: number;
  precio: number;
}

function lineaVacia(): LineaTicket {
  return { descripcion: "", cantidad: 1, precio: 0 };
}

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/**
 * Botón "Ticket Manual" (Reparaciones) — PRUEBA explícita del usuario,
 * 2026-08-26: genera un ticket de venta simple (empresa + líneas + IVA,
 * sin datos de cliente) desde la plantilla nueva de Sheets. No persiste
 * nada — cada "Generar" es independiente, sin numeración ni registro.
 */
export function TicketManualDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [lineas, setLineas] = useState<LineaTicket[]>([lineaVacia()]);
  const [generando, setGenerando] = useState(false);

  function actualizarLinea(i: number, campo: keyof LineaTicket, valor: string | number) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  function agregarLinea() {
    if (lineas.length >= 8) return toast.error("Máximo 8 líneas en la plantilla del ticket");
    setLineas((prev) => [...prev, lineaVacia()]);
  }

  function quitarLinea(i: number) {
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const baseImponible = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precio) || 0), 0);
  const iva = baseImponible * 0.21;
  const total = baseImponible + iva;

  function reiniciar() {
    setLineas([lineaVacia()]);
  }

  async function generar() {
    const lineasValidas = lineas.filter((l) => l.descripcion.trim() && l.cantidad > 0);
    if (lineasValidas.length === 0) return toast.error("Añade al menos una línea con descripción y cantidad");

    setGenerando(true);
    try {
      const res = await fetch("/api/tickets/generar-prueba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineas: lineasValidas }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error desconocido");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ticket-prueba.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Ticket generado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (generando) return;
        if (!o) reiniciar();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="size-5" /> Ticket Manual <span className="text-xs font-normal text-muted-foreground">(prueba — no se guarda)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-5 space-y-1">
                  {i === 0 && <Label className="text-[11px] font-normal text-muted-foreground">Descripción</Label>}
                  <Input value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} placeholder="Descripción" />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-[11px] font-normal text-muted-foreground">Cantidad</Label>}
                  <DecimalInput value={l.cantidad} onChange={(n) => actualizarLinea(i, "cantidad", n)} />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-[11px] font-normal text-muted-foreground">Precio unidad</Label>}
                  <DecimalInput value={l.precio} onChange={(n) => actualizarLinea(i, "precio", n)} />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label className="text-[11px] font-normal text-muted-foreground">Total</Label>}
                  <Input value={euros((Number(l.cantidad) || 0) * (Number(l.precio) || 0))} disabled className="bg-muted/50" />
                </div>
                <div className="col-span-1">
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => quitarLinea(i)} disabled={lineas.length === 1}>
                    <Trash className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button size="sm" variant="outline" className="gap-1.5" onClick={agregarLinea} disabled={lineas.length >= 8}>
            <Add className="size-3.5" /> Añadir línea
          </Button>

          <div className="ml-auto w-full max-w-56 space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Base imponible</span><span>{euros(baseImponible)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IVA (21%)</span><span>{euros(iva)}</span></div>
            <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{euros(total)}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generando}>Cancelar</Button>
          <Button className="gap-1.5" onClick={generar} disabled={generando}>
            <DocumentDownload className="size-4" /> {generando ? "Generando..." : "Generar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
