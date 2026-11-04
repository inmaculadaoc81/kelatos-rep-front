"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StockPieza } from "@/lib/stock-piezas";

export const CAT_RESERVADA = "COMPRA POR PEDIDO";
export const CAT_DEVOLUCION = "DEVOLUCIÓN A PROVEEDOR";
export const CATEGORIAS_ESPECIALES = [CAT_RESERVADA, CAT_DEVOLUCION];

/** Cambia el estado de una pieza reservada (o en devolución) para que pase a ser una pieza normal y disponible del catálogo. */
export function PasarAStockDialog({ pieza, categorias, onOpenChange, onHecho }: { pieza: StockPieza | null; categorias: string[]; onOpenChange: (o: boolean) => void; onHecho: () => void }) {
  const [categoria, setCategoria] = useState("");
  const [enviando, setEnviando] = useState(false);
  const normales = categorias.filter((c) => !CATEGORIAS_ESPECIALES.includes(c));
  const enDevolucion = pieza?.categoria === CAT_DEVOLUCION;

  async function confirmar() {
    if (!pieza) return;
    if (!categoria.trim()) return toast.error("Elige o escribe la categoría con la que quedará en el catálogo");
    setEnviando(true);
    try {
      const res = await fetch(`/api/stock-piezas/${encodeURIComponent(pieza.referencia)}/liberar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoria }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo pasar a stock");
      toast.success("La pieza ya está disponible en el catálogo");
      onOpenChange(false);
      onHecho();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={!!pieza} onOpenChange={(o) => !enviando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pasar a stock disponible</DialogTitle>
        </DialogHeader>
        {pieza && (
          <div className="space-y-3 text-sm">
            <p className="rounded-md border bg-muted/40 p-2.5">
              <b>{pieza.nombre || pieza.referencia}</b>
              <br />
              <span className="text-xs text-muted-foreground">{pieza.descripcion}</span>
            </p>
            <p className="text-muted-foreground">
              {enDevolucion
                ? "Esta pieza está en devolución al proveedor y no está disponible. Si el proveedor no la acepta o decides quedártela, pásala a stock: volverá al catálogo con 1 unidad."
                : "Esta pieza está reservada para una reparación y no está disponible para otras. Si finalmente no se usa, pásala a stock: volverá al catálogo con 1 unidad."}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cat-liberar">Categoría en el catálogo *</Label>
              <Input id="cat-liberar" list="cats-liberar" placeholder="Ej: Pantallas, Teclados…" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
              <datalist id="cats-liberar">{normales.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando}>{enviando ? "Guardando…" : "Pasar a stock"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
