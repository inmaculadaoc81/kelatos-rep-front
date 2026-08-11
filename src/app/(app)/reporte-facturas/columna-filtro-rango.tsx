"use client";

import { useEffect, useState } from "react";
import { Filter } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface RangoFiltro {
  min: number | null;
  max: number | null;
}

/**
 * Reproduce el modo "rango" del dropdown de filtro de columna del
 * original (_rfColEsRango: base/total usan mínimo/máximo en € en vez de
 * una lista de valores — no tendría sentido marcar importes uno a uno).
 */
export function ColumnaFiltroRango({
  seleccion,
  onAplicar,
}: {
  seleccion: RangoFiltro | null;
  onAplicar: (rango: RangoFiltro | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  useEffect(() => {
    if (abierto) {
      setMin(seleccion?.min != null ? String(seleccion.min) : "");
      setMax(seleccion?.max != null ? String(seleccion.max) : "");
    }
  }, [abierto, seleccion]);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<button type="button" className="ml-1 inline-flex size-4 items-center justify-center rounded text-muted-foreground hover:text-foreground" aria-label="Filtrar por rango" />}
      >
        <Filter className={cn("size-3", seleccion && "text-primary")} variant={seleccion ? "Bold" : "Linear"} />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-2">
          <div>
            <Label className="mb-1 text-xs text-muted-foreground">Mínimo (€)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0,00" value={min} onChange={(e) => setMin(e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="mb-1 text-xs text-muted-foreground">Máximo (€)</Label>
            <Input type="number" step="0.01" min="0" placeholder="sin límite" value={max} onChange={(e) => setMax(e.target.value)} className="h-7 text-xs" />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-1.5">
          <Button size="sm" variant="outline" className="h-7" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-7"
            onClick={() => {
              const minN = min.trim() !== "" ? parseFloat(min) : null;
              const maxN = max.trim() !== "" ? parseFloat(max) : null;
              onAplicar(minN === null && maxN === null ? null : { min: minN, max: maxN });
              setAbierto(false);
            }}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
