"use client";

import { useEffect, useState } from "react";
import { SearchNormal1 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CompraFila } from "@/lib/compras";

/** Buscador de pedidos de servicio (ligados a una reparación, kelatos_app.pedidos)
    para el campo "Resguardo / pedido de servicio" del Libro de Compras. Reutiliza
    /api/compras, que ya soporta búsqueda libre por pedido/resguardo/cliente/proveedor
    — no hace falta ninguna ruta nueva. */
export function BuscarPedidoServicioDialog({
  open,
  onOpenChange,
  onSeleccionar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeleccionar: (pedido: CompraFila) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [pedidos, setPedidos] = useState<CompraFila[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!open) setBusqueda("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCargando(true);
    const timer = setTimeout(() => {
      const p = new URLSearchParams({ porPagina: "20" });
      if (busqueda.trim()) p.set("busqueda", busqueda.trim());
      fetch(`/api/compras?${p.toString()}`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setPedidos(d.compras); })
        .finally(() => setCargando(false));
    }, busqueda.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, busqueda]);

  function seleccionar(p: CompraFila) {
    onSeleccionar(p);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar pedido de servicio</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Pedido, resguardo, cliente, proveedor…" className="pl-8" autoFocus />
        </div>

        <div className="flex-1 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/70 text-left text-xs text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="p-2">Pedido</th>
                <th className="p-2">Resguardo</th>
                <th className="p-2">Cliente / equipo</th>
                <th className="p-2">Proveedor</th>
                <th className="p-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Buscando…</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Sin resultados{busqueda.trim() && <> para "{busqueda.trim()}"</>}.</td></tr>
              ) : (
                pedidos.map((p) => (
                  <tr key={p.pedidoId} className="cursor-pointer border-t hover:bg-muted/50" onClick={() => seleccionar(p)}>
                    <td className="p-2 align-top font-mono text-xs">{p.pedidoId}</td>
                    <td className="p-2 align-top font-mono text-xs">{p.resguardo || "—"}</td>
                    <td className="max-w-40 truncate p-2 align-top">{p.clienteNombre || "—"}{p.equipoModelo && <span className="block truncate text-xs text-muted-foreground">{p.equipoModelo}</span>}</td>
                    <td className="p-2 align-top text-muted-foreground">{p.proveedorNombre || p.proveedorOtro || "—"}</td>
                    <td className="p-2 align-top text-xs text-muted-foreground">{p.estado || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">Haz clic en una fila para vincular ese pedido.</p>
      </DialogContent>
    </Dialog>
  );
}
