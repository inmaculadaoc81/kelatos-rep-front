"use client";

import { useState } from "react";
import { Filter } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Proveedor } from "@/app/api/proveedores/route";

/** Embudo de la columna «Proveedor». A diferencia de los demás embudos (que solo filtran la página visible), este filtra en el
 *  servidor: busca en TODOS los pedidos. Sin nada marcado se ven todos. */
export function FiltroProveedor({ proveedores, seleccion, onCambio }: {
  proveedores: Proveedor[]; seleccion: string[]; onCambio: (ids: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busca, setBusca] = useState("");
  const activo = seleccion.length > 0;
  const visibles = proveedores
    .filter((p) => p.nombre.toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }));

  return (
    <span className="ml-1 inline-flex align-middle" onClick={(e) => e.stopPropagation()}>
      <Popover open={abierto} onOpenChange={(o) => { setAbierto(o); if (!o) setBusca(""); }}>
        <PopoverTrigger render={<button type="button" className="inline-flex" aria-label="Filtrar por proveedor" />}>
          <span title="Filtrar por proveedor" className={`inline-flex size-5 items-center justify-center rounded ${activo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
            <Filter className="size-3" />
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-2 p-2">
          <p className="text-xs font-medium text-muted-foreground">Proveedor</p>
          <Input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="h-8" />
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {visibles.map((p) => (
              <label key={p.proveedorId} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm font-normal hover:bg-accent">
                <Checkbox checked={seleccion.includes(p.proveedorId)}
                  onCheckedChange={(v) => onCambio(v === true ? [...seleccion, p.proveedorId] : seleccion.filter((x) => x !== p.proveedorId))} />
                <span className="truncate" title={p.nombre}>{p.nombre}</span>
              </label>
            ))}
            {visibles.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">Sin valores</p>}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled={!activo} onClick={() => onCambio([])}>Quitar filtro</Button>
            <span className="text-[10px] font-normal text-muted-foreground">Busca en todos los pedidos</span>
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}
