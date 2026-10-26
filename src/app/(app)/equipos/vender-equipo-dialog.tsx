"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Equipo } from "@/lib/equipos";

type FacturaEncontrada = { numero: string; cliente: string | null; total: string | null; origen: string };

/**
 * Vender un equipo de alquiler ligándolo a su factura de venta. Dos caminos:
 *  - «Crear la factura ahora»: se abre la factura manual con el equipo precargado y, al generarla, el equipo queda vendido con ese número.
 *  - «Ya tengo la factura»: se indica el número de una factura ya emitida (se comprueba que existe; si no, hay que confirmarlo).
 * Con `soloFactura` (equipo ya vendido sin factura registrada, p. ej. vendido antes de esta función) solo se pide el número.
 */
export function VenderEquipoDialog({ equipo, soloFactura, onCerrar, onFacturar, onVendido }: {
  equipo: Equipo;
  soloFactura?: boolean;
  onCerrar: () => void;
  onFacturar: () => void;
  onVendido: () => void;
}) {
  const [modo, setModo] = useState<"elegir" | "numero">(soloFactura ? "numero" : "elegir");
  const [numero, setNumero] = useState(equipo.facturaVenta ?? "");
  const [comprador, setComprador] = useState(equipo.comprador ?? "");
  const [trabajando, setTrabajando] = useState(false);
  const [encontrada, setEncontrada] = useState<FacturaEncontrada | null>(null);
  const [noExiste, setNoExiste] = useState(false);

  async function comprobar() {
    if (!numero.trim()) { toast.error("Escribe el número de factura"); return; }
    setTrabajando(true);
    setEncontrada(null);
    setNoExiste(false);
    try {
      const d = await fetch(`/api/equipos/buscar-factura?numero=${encodeURIComponent(numero.trim())}`, { cache: "no-store" }).then((r) => r.json());
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      if (d.existe) { setEncontrada(d.factura as FacturaEncontrada); if (!comprador.trim() && d.factura?.cliente) setComprador(d.factura.cliente); }
      else setNoExiste(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setTrabajando(false);
    }
  }

  async function guardar(forzar: boolean) {
    setTrabajando(true);
    try {
      const d = await fetch(`/api/equipos/${encodeURIComponent(equipo.id)}/vender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroFactura: numero.trim(), comprador: comprador.trim(), forzar }),
      }).then((r) => r.json());
      if (!d.ok) throw new Error(d.error || "Error desconocido");
      toast.success(soloFactura ? `Factura ${numero.trim()} guardada en ${equipo.id}` : `${equipo.id} vendido con la factura ${numero.trim()}`);
      onVendido();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      setTrabajando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !trabajando) onCerrar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{soloFactura ? "Factura de la venta" : "Vender equipo"}</DialogTitle>
          <DialogDescription>
            {equipo.marca} {equipo.modelo} ({equipo.id}){equipo.serie ? ` · S/N ${equipo.serie}` : ""}
            {soloFactura ? ". Este equipo figura como vendido: indica el número de su factura de venta." : ". Elige cómo registrar la factura de la venta."}
          </DialogDescription>
        </DialogHeader>

        {modo === "elegir" ? (
          <div className="grid gap-2">
            <button type="button" onClick={onFacturar} className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50">
              <p className="text-sm font-medium">Crear la factura ahora</p>
              <p className="text-xs text-muted-foreground">Se abre la factura manual con el equipo ya cargado{equipo.precioVenta > 0 ? ` (${equipo.precioVenta.toLocaleString("es-ES", { minimumFractionDigits: 2 })} € + IVA, editable)` : ""}. Al generarla, el equipo queda vendido con su número.</p>
            </button>
            <button type="button" onClick={() => setModo("numero")} className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50">
              <p className="text-sm font-medium">Ya tengo la factura</p>
              <p className="text-xs text-muted-foreground">Escribe el número de una factura ya emitida; se comprueba que existe en el sistema.</p>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="veNum">Número de factura</Label>
              <Input id="veNum" value={numero} maxLength={60} placeholder="Ej.: 1-002984" onChange={(e) => { setNumero(e.target.value); setEncontrada(null); setNoExiste(false); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="veComp">Comprador <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Input id="veComp" value={comprador} maxLength={160} onChange={(e) => setComprador(e.target.value)} />
            </div>
            {encontrada && (
              <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
                Factura encontrada ({encontrada.origen}){encontrada.cliente ? ` · ${encontrada.cliente}` : ""}{encontrada.total ? ` · ${Number(encontrada.total).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €` : ""}.
              </p>
            )}
            {noExiste && (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                No encuentro la factura «{numero.trim()}» en el sistema. Revisa el número; si estás seguro de que es correcto (por ejemplo, se emitió fuera del sistema), puedes guardarlo igualmente.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {modo === "numero" && !soloFactura && <Button variant="ghost" onClick={() => setModo("elegir")} disabled={trabajando}>Atrás</Button>}
          <Button variant="ghost" onClick={onCerrar} disabled={trabajando}>Cancelar</Button>
          {modo === "numero" && (
            encontrada ? <Button onClick={() => guardar(false)} disabled={trabajando}>{trabajando ? "Guardando…" : soloFactura ? "Guardar factura" : "Marcar como vendido"}</Button>
            : noExiste ? <Button variant="outline" onClick={() => guardar(true)} disabled={trabajando}>{trabajando ? "Guardando…" : "Guardar igualmente"}</Button>
            : <Button onClick={comprobar} disabled={trabajando}>{trabajando ? "Comprobando…" : "Comprobar factura"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
