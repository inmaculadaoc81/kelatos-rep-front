"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ticket, CloseCircle, Building, Add, Trash, ArrowRight2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";

const IVA_PCT = 0.21;

interface LineaTicket {
  descripcion: string;
  cantidad: number;
  precio: number;
  /** Porcentaje (0-100) — aplicado sobre el subtotal de la línea (cantidad
      × precio) para obtener su total. Columna "DESCUENTO" añadida a la
      plantilla el 2026-08-26 (petición del usuario: descuentos por línea,
      y también "globales" poniéndolo en una única línea). */
  descuento: number;
}

function lineaVacia(): LineaTicket {
  return { descripcion: "", cantidad: 1, precio: 0, descuento: 0 };
}

function totalLinea(l: LineaTicket): number {
  const subtotal = (Number(l.cantidad) || 0) * (Number(l.precio) || 0);
  const descuento = Math.min(100, Math.max(0, Number(l.descuento) || 0));
  return subtotal * (1 - descuento / 100);
}

/**
 * Puerto simplificado de construirLineasIniciales() (factura-reparacion-
 * dialog.tsx) para el caso común: mano de obra + piezas de los
 * presupuestos aceptados. A propósito NO replica los casos especiales de
 * la factura real (cintas, remanente de anticipo, descuento de revisión,
 * portes de mensajería) — "Ticket Rápido" es la alternativa simple, no un
 * sustituto completo de Facturación.
 */
function lineasDesdePresupuestos(detalle: ReparacionDetalle): LineaTicket[] {
  const lineas: LineaTicket[] = [];
  const aceptados = detalle.presupuestos.filter((p) => p.estado === "aceptado");
  for (const p of aceptados) {
    if (p.manoObra > 0) lineas.push({ descripcion: "Mano de obra", cantidad: 1, precio: p.manoObra, descuento: 0 });
    for (const pz of p.piezas) {
      if (pz.precio > 0) lineas.push({ descripcion: pz.descripcion || "Pieza", cantidad: 1, precio: pz.precio, descuento: 0 });
    }
  }
  return lineas.length > 0 ? lineas : [lineaVacia()];
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
 * Botón "Ticket Manual" (Reparaciones, suelto) y "Ticket Rápido" (junto a
 * Facturación, en el detalle de una reparación) — mismo diálogo, dos modos:
 * - Suelto (sin `resguardo`): prueba explícita, no persiste nada, el PDF
 *   se descarga directo.
 * - Ligado a una reparación (`resguardo` + `detalle`): numeración real
 *   (kelatos_app.ticket_venta_seq, desde 1000), líneas precargadas desde
 *   los presupuestos aceptados, el PDF se guarda en Drive. NO marca
 *   entrega — igual que Facturación real, eso sigue siendo un paso
 *   aparte ("Entregado en Local" / "Marcar como enviado").
 */
export function TicketManualDialog({
  open,
  onOpenChange,
  resguardo,
  detalle,
  onGenerado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resguardo?: string;
  detalle?: ReparacionDetalle;
  onGenerado?: () => void;
}) {
  const esReal = !!resguardo;
  const [lineas, setLineas] = useState<LineaTicket[]>([lineaVacia()]);
  const [estado, setEstado] = useState<"Cobrada" | "Pendiente">("Cobrada");
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<{ numeroTicket: string; urlTicket: string } | null>(null);

  useEffect(() => {
    if (open) {
      setLineas(esReal && detalle ? lineasDesdePresupuestos(detalle) : [lineaVacia()]);
      setEstado(detalle?.estadoTicket === "Pendiente" ? "Pendiente" : "Cobrada");
      // Si esta reparación ya tiene un ticket generado, se muestra tal
      // cual en vez de un formulario en blanco — sin esto, reabrir el
      // diálogo (p.ej. tras generar uno) ofrecía crear otro sin ningún
      // aviso, gastando un número nuevo y perdiendo el enlace anterior
      // (numero_ticket/url_ticket es una sola columna, no un historial).
      setResultado(esReal && detalle?.numeroTicket ? { numeroTicket: detalle.numeroTicket, urlTicket: detalle.urlTicket } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const baseImponible = lineas.reduce((s, l) => s + totalLinea(l), 0);
  const iva = baseImponible * IVA_PCT;
  const total = baseImponible + iva;

  function cerrar(o: boolean) {
    if (generando) return;
    onOpenChange(o);
  }

  async function generar() {
    const lineasValidas = lineas.filter((l) => l.descripcion.trim() && l.cantidad > 0);
    if (lineasValidas.length === 0) return toast.error("Añade al menos una línea con descripción y cantidad");

    setGenerando(true);
    try {
      if (esReal) {
        const res = await fetch(`/api/reparaciones/${resguardo}/ticket-venta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineas: lineasValidas, estado }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error desconocido");
        toast.success(`Ticket ${data.numeroTicket} generado correctamente`);
        setResultado({ numeroTicket: data.numeroTicket, urlTicket: data.urlTicket });
        onGenerado?.();
        return;
      }

      const res = await fetch("/api/tickets/generar-prueba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineas: lineasValidas, estado }),
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
        <Cabecera
          titulo={esReal ? "Ticket Rápido" : "Ticket Manual"}
          subtitulo={esReal ? `— Resguardo #${resguardo}` : "(prueba — no se guarda)"}
          onClose={() => cerrar(false)}
        />

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 bg-muted/30 p-4">
            {resultado && (
              <div className="flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                <span>Ticket <strong>{resultado.numeroTicket}</strong> generado correctamente.</span>
                {resultado.urlTicket && (
                  <Button variant="outline" size="sm" className="gap-1.5" nativeButton={false} render={<Link href={resultado.urlTicket} target="_blank" rel="noreferrer" />}>
                    Ver PDF
                  </Button>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <CampoLectura label="Serie / Código" valor={resultado?.numeroTicket || (esReal ? "Se asignará al generar" : "Se asignará al generar")} />
              <CampoLectura label="Fecha" valor={new Date().toLocaleDateString("es-ES")} />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={estado} onValueChange={(v) => setEstado(v === "Pendiente" ? "Pendiente" : "Cobrada")} disabled={!!resultado}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cobrada">Cobrada</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {!resultado && (
                  <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-white hover:bg-white/15 hover:text-white" onClick={agregarLinea} disabled={lineas.length >= 8}>
                    <Add className="size-3" /> Añadir línea
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Descripción</th>
                      <th className="w-16 px-2 py-1.5 text-center font-medium">Cantidad</th>
                      <th className="w-24 px-2 py-1.5 text-right font-medium">Precio unidad</th>
                      <th className="w-24 px-2 py-1.5 text-right font-medium">Subtotal</th>
                      <th className="w-20 px-2 py-1.5 text-center font-medium">Descuento</th>
                      <th className="w-24 px-2 py-1.5 text-right font-medium">Total</th>
                      <th className="w-7 px-1 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1"><Input className="h-8 text-sm" placeholder="Descripción" value={l.descripcion} onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)} disabled={!!resultado} /></td>
                        <td className="p-1"><DecimalInput className="h-8 text-center text-sm" value={l.cantidad} onChange={(n) => actualizarLinea(i, "cantidad", n)} disabled={!!resultado} /></td>
                        <td className="p-1"><DecimalInput className="h-8 text-right text-sm" value={l.precio} onChange={(n) => actualizarLinea(i, "precio", n)} disabled={!!resultado} /></td>
                        <td className="px-2 py-1 text-right text-muted-foreground">{euros((Number(l.cantidad) || 0) * (Number(l.precio) || 0))}</td>
                        <td className="p-1">
                          <div className="relative">
                            <DecimalInput className="h-8 pr-5 text-right text-sm" value={l.descuento} onChange={(n) => actualizarLinea(i, "descuento", Math.min(100, Math.max(0, n)))} disabled={!!resultado} />
                            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                          </div>
                        </td>
                        <td className="px-2 py-1 text-right font-medium">{euros(totalLinea(l))}</td>
                        <td className="p-1">
                          {!resultado && (
                            <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => quitarLinea(i)} disabled={lineas.length === 1}>
                              <Trash className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="text-sm">
                    <tr className="border-t bg-muted/30">
                      <td colSpan={5}></td>
                      <td className="px-2 py-1 text-right text-xs text-muted-foreground">Base imponible</td>
                      <td className="px-2 py-1 text-right font-medium">{euros(baseImponible)}</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td colSpan={5}></td>
                      <td className="px-2 py-1 text-right text-xs text-muted-foreground">IVA (21%)</td>
                      <td className="px-2 py-1 text-right font-medium">{euros(iva)}</td>
                    </tr>
                    <tr className="border-t bg-primary/5">
                      <td colSpan={5}></td>
                      <td className="px-2 py-1.5 text-right text-xs font-semibold">TOTAL</td>
                      <td className="px-2 py-1.5 text-right text-base font-bold">{euros(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {esReal && !resultado && (
              <p className="text-xs text-muted-foreground">
                Esto solo genera el ticket — para marcar el equipo como entregado, usa "Entregado en Local" o "Marcar como enviado" aparte, igual que con Facturación.
              </p>
            )}
          </div>
        </ScrollArea>

        <footer className="flex justify-end gap-2 border-t bg-card px-4 py-3">
          <Button variant="secondary" onClick={() => cerrar(false)} disabled={generando}>
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button className="gap-1.5" onClick={generar} disabled={generando}>
              <ArrowRight2 className="size-4" /> {generando ? "Generando…" : "Generar PDF"}
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
