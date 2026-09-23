"use client";

import { useCallback, useEffect, useState } from "react";
import { Book1, Warning2 } from "@/lib/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FacturaRecibida, euros } from "@/lib/facturas-recibidas";
import { FacturaRecibidaFormDialog } from "./factura-recibida-form-dialog";

/**
 * Facturas del Libro de Compras enlazadas a un pedido (de servicio en
 * Compras, o de stock en Stock de Piezas) — ya sea enlazadas a mano o por
 * la importación automática desde Drive. Cada una se abre en el mismo
 * formulario del Libro de Compras (con su archivo adjunto a la vista).
 */
export function FacturasEnlazadasDialog({
  tipo,
  id,
  titulo,
  open,
  onOpenChange,
  onCambio,
}: {
  tipo: "pedido" | "stock";
  id: string | number | null;
  titulo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCambio?: () => void;
}) {
  const [facturas, setFacturas] = useState<FacturaRecibida[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<FacturaRecibida | null>(null);

  const cargar = useCallback(() => {
    if (id === null || id === "") return;
    setError(null);
    const url = tipo === "stock"
      ? `/api/facturas-recibidas/por-stock-pedido/${encodeURIComponent(String(id))}`
      : `/api/facturas-recibidas/por-pedido/${encodeURIComponent(String(id))}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setFacturas(d.facturas); else setError(d.error || "No se pudieron cargar las facturas"); })
      .catch(() => setError("No se pudieron cargar las facturas"));
  }, [tipo, id]);

  useEffect(() => {
    if (open) { setFacturas(null); cargar(); }
  }, [open, cargar]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogTitle className="flex items-center gap-2"><Book1 className="size-5" /> {titulo}</DialogTitle>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && facturas === null && <Skeleton className="h-16 w-full" />}
          {facturas && facturas.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Este pedido todavía no tiene ninguna factura enlazada.
            </p>
          )}
          {facturas && facturas.length > 0 && (
            <ul className="space-y-2">
              {facturas.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{f.numeroRecepcion} <span className="font-normal text-muted-foreground">· {f.proveedorNombre} · nº {f.numeroFacturaProveedor}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {f.fechaExpedicion} · {euros(f.importeTotal)}
                      {f.origen === "automatico" ? " · importada automáticamente" : ""}
                    </p>
                    {f.estadoRevision === "pendiente" && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <Warning2 className="size-3.5" /> Pendiente de revisión{f.revisionMotivo ? ` — ${f.revisionMotivo}` : ""}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setAbierta(f)}>Abrir</Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <FacturaRecibidaFormDialog
        facturaExistente={abierta}
        open={!!abierta}
        onOpenChange={(o) => !o && setAbierta(null)}
        onGuardado={() => { cargar(); onCambio?.(); }}
      />
    </>
  );
}
