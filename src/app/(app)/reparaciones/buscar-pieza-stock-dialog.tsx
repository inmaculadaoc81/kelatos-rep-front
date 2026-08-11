"use client";

import { useEffect, useState } from "react";
import { SearchNormal1, Add } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockPieza } from "@/lib/stock-piezas";

function euros(n: number): string {
  return n ? n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" : "—";
}

/** Reproduce el modal #modalBuscarPiezaStock (_bpsAbrir/_bpsFiltrar/_bpsSeleccionar) del original. */
export function BuscarPiezaStockDialog({
  open,
  onOpenChange,
  onSeleccionar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeleccionar: (pieza: StockPieza) => void;
}) {
  const [piezas, setPiezas] = useState<StockPieza[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!open) return;
    setBusqueda("");
    setCargando(true);
    fetch("/api/stock-piezas")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPiezas(d.piezas); })
      .finally(() => setCargando(false));
  }, [open]);

  const filtradas = piezas.filter((p) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return p.nombre.toLowerCase().includes(q) || p.referencia.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar pieza en catálogo</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, referencia o categoría..." className="pl-8" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : filtradas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
          ) : (
            <div className="space-y-1.5">
              {filtradas.map((p) => (
                <div key={p.referencia} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.nombre}</p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <code>{p.referencia}</code>
                      <Badge variant={p.stockDisponible > 0 ? "default" : "destructive"} className="h-4 px-1 text-[10px]">
                        {p.stockDisponible}
                      </Badge>
                      <span>Coste: {euros(p.costeInterno)}</span>
                      <span>Precio: {euros(p.precioCliente)}</span>
                    </p>
                  </div>
                  <Button size="sm" className="h-7 gap-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onSeleccionar(p)}>
                    <Add className="size-3.5" /> Añadir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
