"use client";

import { useEffect, useState } from "react";
import { Filter, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Reproduce el filtro de columna "estilo Excel" del original
 * (_fcColAbrir/_fcColAplicar): icono de embudo en la cabecera que abre un
 * desplegable con buscador, checkboxes por valor único y
 * Aplicar/Cancelar. `seleccion === null` significa "sin filtro" (todos).
 */
export function ColumnaFiltro({
  opciones,
  seleccion,
  onAplicar,
}: {
  opciones: string[];
  seleccion: Set<string> | null;
  onAplicar: (seleccion: Set<string> | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pendiente, setPendiente] = useState<Set<string>>(new Set(seleccion ?? opciones));

  useEffect(() => {
    if (abierto) {
      setPendiente(new Set(seleccion ?? opciones));
      setBusqueda("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const filtradas = opciones.filter((o) => o.toLowerCase().includes(busqueda.toLowerCase()));
  const todosMarcados = pendiente.size >= opciones.length;

  function toggleTodos(marcar: boolean) {
    setPendiente(marcar ? new Set(opciones) : new Set());
  }

  function toggleOpcion(valor: string, marcar: boolean) {
    const siguiente = new Set(pendiente);
    if (marcar) siguiente.add(valor);
    else siguiente.delete(valor);
    setPendiente(siguiente);
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="ml-1 inline-flex size-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Filtrar columna"
          />
        }
      >
        <Filter className={cn("size-3", seleccion && "text-primary")} variant={seleccion ? "Bold" : "Linear"} />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="flex items-center gap-1.5 border-b p-1.5">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="h-7 text-xs"
            autoFocus
          />
          <Button
            size="icon-sm"
            variant="ghost"
            className="size-7 shrink-0"
            title="Quitar filtro"
            onClick={() => {
              onAplicar(null);
              setAbierto(false);
            }}
          >
            <CloseCircle className="size-3.5" />
          </Button>
        </div>
        <div className="max-h-56 space-y-0.5 overflow-y-auto p-1.5">
          <label className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted">
            <Checkbox checked={todosMarcados} onCheckedChange={(c) => toggleTodos(c === true)} />
            <span className="font-medium">(Elegir todos)</span>
          </label>
          {filtradas.map((op) => (
            <label key={op} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted">
              <Checkbox checked={pendiente.has(op)} onCheckedChange={(c) => toggleOpcion(op, c === true)} />
              <span className="truncate">{op}</span>
            </label>
          ))}
          {filtradas.length === 0 && <p className="px-1.5 py-2 text-xs text-muted-foreground">Sin coincidencias</p>}
        </div>
        <div className="flex justify-end gap-1.5 border-t p-1.5">
          <Button size="sm" variant="outline" className="h-7" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-7"
            onClick={() => {
              onAplicar(pendiente.size >= opciones.length ? null : pendiente);
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
