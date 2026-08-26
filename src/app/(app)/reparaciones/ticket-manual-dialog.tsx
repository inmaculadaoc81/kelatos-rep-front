"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ticket, CloseCircle, Building, Add, Trash, ArrowRight2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import { ScrollArea } from "@/components/ui/scroll-area";

const IVA_PCT = 0.21;

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

function Cabecera({ titulo, subtitulo, onClose }: { titulo: string; subtitulo: string; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
      <Ticket className="size-4.5 shrink-0" />
      <DialogTitle className="text-sm font-semibold text-primary-foreground">
        {titulo} <span className="font-normal opacity-80">{subtitulo}</span>
      </DialogTitle>
      <Button variant="ghost" size="icon-sm" className="ml-auto text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={onClose}>
        <CloseCircle className="size-4" />
      </Button>
    </header>
  );
}

function CampoLectura({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={valor} disabled className="bg-muted/50" />
    </div>
  );
}

/**
 * Botón "Ticket Manual" (Reparaciones) — PRUEBA explícita del usuario,
 * 2026-08-26: genera un ticket de venta simple (empresa + líneas + IVA,
 * sin datos de cliente) desde la plantilla nueva de Sheets. No persiste
 * nada — cada "Generar" es independiente, sin numeración ni registro.
 * Mismo lenguaje visual que NuevaFacturaManualDialog, sin la tarjeta de
 * Cliente (no aplica a una boleta).
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
  const iva = baseImponible * IVA_PCT;
  const total = baseImponible + iva;

  function reiniciar() {
    setLineas([lineaVacia()]);
  }

  function cerrar(o: boolean) {
    if (generando) return;
    if (!o) reiniciar();
    onOpenChange(o);
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
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-4xl gap-0 p-0 sm:max-w-4xl" showCloseButton={false}>
        <Cabecera titulo="Ticket Manual" subtitulo="(prueba — no se guarda)" onClose={() => cerrar(false)} />

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoLectura label="Serie / Código" valor="Se asignará al generar" />
              <CampoLectura label="Fecha" valor={new Date().toLocaleDateString("es-ES")} />
            </div>

            <div className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-center gap-1.5 rounded-t-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
                <Building className="size-3.5" /> Emisor
              </div>
              <div className="space-y-0.5 p-3 text-xs">
                <p className="font-semibold">AFFIRMA TECHNOLOGY GROUP S.L.</p>
                <p>N.I.F.: B72990443</p>
                <p className="text-muted-foreground">Blasco de Garay 63 BJ 2, 28015 Madrid</p>
                <p className="text-muted-foreground">914 468 503</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card shadow-sm">
              <div className="flex items-center justify-between rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                <span>Conceptos</span>
                <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-white hover:bg-white/15 hover:text-white" onClick={agregarLinea} disabled={lineas.length >= 8}>
                  <Add className="size-3" /> Añadir línea
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Descripción</th>
                      <th className="w-20 px-2 py-1.5 text-center font-medium">Cantidad</th>
                      <th className="w-28 px-2 py-1.5 text-right font-medium">Precio unidad</th>
                      <th className="w-28 px-2 py-1.5 text-right font-medium">Total</th>
                      <th className="w-7 px-1 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1"><Input className="h-8 text-sm" placeholder="Descripción" value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} /></td>
                        <td className="p-1"><DecimalInput className="h-8 text-center text-sm" value={l.cantidad} onChange={(n) => actualizarLinea(i, "cantidad", n)} /></td>
                        <td className="p-1"><DecimalInput className="h-8 text-right text-sm" value={l.precio} onChange={(n) => actualizarLinea(i, "precio", n)} /></td>
                        <td className="px-2 py-1 text-right font-medium">{euros((Number(l.cantidad) || 0) * (Number(l.precio) || 0))}</td>
                        <td className="p-1">
                          <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => quitarLinea(i)} disabled={lineas.length === 1}>
                            <Trash className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="text-sm">
                    <tr className="border-t bg-muted/30">
                      <td colSpan={3}></td>
                      <td className="px-2 py-1 text-right text-xs text-muted-foreground">Base imponible</td>
                      <td className="px-2 py-1 text-right font-medium">{euros(baseImponible)}</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td colSpan={3}></td>
                      <td className="px-2 py-1 text-right text-xs text-muted-foreground">IVA (21%)</td>
                      <td className="px-2 py-1 text-right font-medium">{euros(iva)}</td>
                    </tr>
                    <tr className="border-t bg-primary/5">
                      <td colSpan={3}></td>
                      <td className="px-2 py-1.5 text-right text-xs font-semibold">TOTAL</td>
                      <td className="px-2 py-1.5 text-right text-base font-bold">{euros(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </ScrollArea>

        <footer className="flex justify-end gap-2 border-t bg-card px-4 py-3">
          <Button variant="secondary" onClick={() => cerrar(false)} disabled={generando}>Cancelar</Button>
          <Button className="gap-1.5" onClick={generar} disabled={generando}>
            <ArrowRight2 className="size-4" /> {generando ? "Generando…" : "Generar PDF"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
