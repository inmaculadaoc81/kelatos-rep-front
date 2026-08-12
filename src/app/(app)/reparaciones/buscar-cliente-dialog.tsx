"use client";

import { useEffect, useState } from "react";
import { SearchNormal1 } from "@/lib/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Cliente } from "@/lib/clientes";

/** Reproduce el modal #modalBuscarCliente (abrirBuscarCliente/_bcFiltrar/_bcSeleccionar) del original, en modo "vf" (factura). */
export function BuscarClienteDialog({
  open,
  onOpenChange,
  onSeleccionar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeleccionar: (cliente: Cliente) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!open) setBusqueda("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = busqueda.trim();
    setCargando(true);
    const timer = setTimeout(() => {
      fetch(`/api/clientes${q ? `?buscar=${encodeURIComponent(q)}` : ""}`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setClientes(d.clientes); })
        .finally(() => setCargando(false));
    }, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, busqueda]);

  function seleccionar(c: Cliente) {
    onSeleccionar(c);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar cliente</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, código, DNI, teléfono…" className="pl-8" autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Buscando…</p>
          ) : clientes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-20 p-1.5">Código</th>
                  <th className="p-1.5">Nombre</th>
                  <th className="p-1.5">DNI / CIF</th>
                  <th className="p-1.5">Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.codigo} className="cursor-pointer border-t hover:bg-muted/50" onClick={() => seleccionar(c)}>
                    <td className="p-1.5"><span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{c.codigo}</span></td>
                    <td className="p-1.5 font-medium">{c.nombre || "-"}</td>
                    <td className="p-1.5 text-muted-foreground">{c.dniCif || "-"}</td>
                    <td className="p-1.5">{c.telefono || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
