"use client";

import { useEffect, useState } from "react";
import { SearchNormal1 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FacturaRecibida, euros } from "@/lib/facturas-recibidas";

function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Buscador de facturas del mismo proveedor, para vincular una rectificativa
    a la factura original que corrige (campo "Factura rectificada de"). */
export function BuscarFacturaRectificadaDialog({
  open,
  onOpenChange,
  proveedorId,
  excluirId,
  onSeleccionar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedorId: string;
  excluirId?: number;
  onSeleccionar: (factura: FacturaRecibida) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [facturas, setFacturas] = useState<FacturaRecibida[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!open) setBusqueda("");
  }, [open]);

  useEffect(() => {
    if (!open || !proveedorId) return;
    setCargando(true);
    const timer = setTimeout(() => {
      const p = new URLSearchParams({ proveedorId, limit: "20" });
      if (busqueda.trim()) p.set("q", busqueda.trim());
      fetch(`/api/facturas-recibidas?${p.toString()}`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setFacturas((d.facturas as FacturaRecibida[]).filter((f) => f.id !== excluirId)); })
        .finally(() => setCargando(false));
    }, busqueda.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, busqueda, proveedorId, excluirId]);

  function seleccionar(f: FacturaRecibida) {
    onSeleccionar(f);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar factura rectificada</DialogTitle>
        </DialogHeader>

        {!proveedorId ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Selecciona primero el proveedor de la factura.</p>
        ) : (
          <>
            <div className="relative">
              <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nº de factura, nº de recepción…" className="pl-8" autoFocus />
            </div>

            <div className="flex-1 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/70 text-left text-xs text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="p-2">Nº recepción</th>
                    <th className="p-2">Nº factura</th>
                    <th className="p-2">Fecha</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">Buscando…</td></tr>
                  ) : facturas.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">Sin resultados{busqueda.trim() && <> para "{busqueda.trim()}"</>}.</td></tr>
                  ) : (
                    facturas.map((f) => (
                      <tr key={f.id} className="cursor-pointer border-t hover:bg-muted/50" onClick={() => seleccionar(f)}>
                        <td className="p-2 align-top font-mono text-xs">{f.numeroRecepcion}</td>
                        <td className="p-2 align-top">{f.numeroFacturaProveedor}</td>
                        <td className="p-2 align-top text-xs text-muted-foreground">{fechaCorta(f.fechaExpedicion)}</td>
                        <td className="p-2 align-top text-right tabular-nums">{euros(f.importeTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">Haz clic en una fila para vincularla como la factura original.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
