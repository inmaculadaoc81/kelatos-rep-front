"use client";

import { useEffect, useState } from "react";
import { Filter } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Mismo icono de embudo que el resto de tablas: se rellena y se pone en azul cuando la columna tiene un filtro activo. */
function Disparador({ activo, etiqueta }: { activo: boolean; etiqueta: string }) {
  return (
    <PopoverTrigger render={<button type="button" className="ml-1 inline-flex size-4 items-center justify-center rounded text-muted-foreground hover:text-foreground" aria-label={etiqueta} />}>
      <Filter className={cn("size-3", activo && "text-primary")} variant={activo ? "Bold" : "Linear"} />
    </PopoverTrigger>
  );
}

/** Filtro de texto («contiene…») para columnas como Proveedor o Nº de factura. */
export function ColumnaFiltroTexto({ valor, onAplicar, placeholder = "Contiene…" }: { valor: string; onAplicar: (v: string) => void; placeholder?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(valor);
  useEffect(() => {
    if (abierto) setTexto(valor);
  }, [abierto, valor]);
  const aplicar = (v: string) => {
    onAplicar(v.trim());
    setAbierto(false);
  };
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <Disparador activo={!!valor} etiqueta="Filtrar columna" />
      <PopoverContent className="w-56 p-3" align="start">
        <Input
          autoFocus
          value={texto}
          placeholder={placeholder}
          className="h-7 text-xs"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") aplicar(texto);
          }}
        />
        <div className="mt-3 flex justify-between gap-1.5">
          <Button size="sm" variant="ghost" className="h-7" onClick={() => aplicar("")} disabled={!valor && !texto}>Quitar filtro</Button>
          <Button size="sm" className="h-7" onClick={() => aplicar(texto)}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface RangoFechas {
  desde: string;
  hasta: string;
}

/** Filtro por rango de fechas (desde / hasta) para columnas como Fecha o Registrada. */
export function ColumnaFiltroFechas({ valor, onAplicar }: { valor: RangoFechas; onAplicar: (r: RangoFechas) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [desde, setDesde] = useState(valor.desde);
  const [hasta, setHasta] = useState(valor.hasta);
  useEffect(() => {
    if (abierto) {
      setDesde(valor.desde);
      setHasta(valor.hasta);
    }
  }, [abierto, valor]);
  const activo = !!(valor.desde || valor.hasta);
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <Disparador activo={activo} etiqueta="Filtrar por fechas" />
      <PopoverContent className="w-60 p-3" align="start">
        <div className="space-y-2">
          <div>
            <Label className="mb-1 text-xs text-muted-foreground">Desde</Label>
            <Input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="mb-1 text-xs text-muted-foreground">Hasta</Label>
            <Input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="h-7 text-xs" />
          </div>
        </div>
        <div className="mt-3 flex justify-between gap-1.5">
          <Button size="sm" variant="ghost" className="h-7" disabled={!activo && !desde && !hasta} onClick={() => { onAplicar({ desde: "", hasta: "" }); setAbierto(false); }}>Quitar filtro</Button>
          <Button size="sm" className="h-7" onClick={() => { onAplicar({ desde, hasta }); setAbierto(false); }}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Filtro de una sola opción (Almacén, Estado de pago, Revisión). `valor` vacío = sin filtro. */
export function ColumnaFiltroOpciones({ opciones, valor, onAplicar }: { opciones: { id: string; etiqueta: string }[]; valor: string; onAplicar: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <Disparador activo={!!valor} etiqueta="Filtrar columna" />
      <PopoverContent className="w-52 p-1" align="start">
        {[{ id: "", etiqueta: "Todos" }, ...opciones].map((o) => (
          <button
            key={o.id || "todos"}
            type="button"
            onClick={() => { onAplicar(o.id); setAbierto(false); }}
            className={cn("flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-muted", valor === o.id && "bg-muted font-medium text-primary")}
          >
            {o.etiqueta}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
