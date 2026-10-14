"use client";

import { useRef, useState } from "react";
import { Box1, Lock } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ReparacionDetalle } from "@/lib/reparacion-detalle";

/**
 * Botón "Casillero" de la fila "Estado actual" del resguardo: indica dónde está guardado físicamente el
 * equipo en el local (estantería, casillero). Sin valor muestra "Casillero"; con valor, "Casillero: A3".
 * Al pulsarlo se abre un pequeño cuadro para escribirlo, cambiarlo o quitarlo.
 *
 * Usa el mismo endpoint que el bloque "Equipo" (PATCH /equipo): el servidor exige el modelo, así que se
 * reenvían tal cual el modelo y el síntoma actuales y solo cambia el casillero.
 */
export function CasilleroBoton({
  detalle,
  onActualizado,
  bloqueado = false,
}: {
  detalle: ReparacionDetalle;
  onActualizado: () => void;
  /** Reparación entregada y facturada: el equipo ya salió, no se edita. */
  bloqueado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);

  const actual = detalle.equipo.casillero;

  async function guardar(nuevo: string) {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const res = await fetch(`/api/reparaciones/${detalle.resguardo}/equipo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelo: detalle.equipo.modelo, sintoma: detalle.equipo.sintoma, casillero: nuevo.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(nuevo.trim() ? `Casillero guardado: ${nuevo.trim()}` : "Casillero quitado");
      setAbierto(false);
      onActualizado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  if (bloqueado) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" disabled title="Reparación entregada y facturada: no se puede editar el casillero">
        <Lock className="size-3.5" /> Casillero{actual ? `: ${actual}` : ""}
      </Button>
    );
  }

  return (
    <Popover
      open={abierto}
      onOpenChange={(o) => {
        if (guardando) return;
        if (o) setValor(actual);
        setAbierto(o);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className={actual ? "gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400" : "gap-1.5"}
            title={actual ? "Cambiar el casillero donde está guardado el equipo" : "Indicar en qué casillero se guarda el equipo"}
          />
        }
      >
        <Box1 className="size-3.5" /> Casillero{actual ? `: ${actual}` : ""}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Casillero del equipo</p>
        <Input
          autoFocus
          placeholder="Casillero (p. ej. A3)"
          maxLength={100}
          value={valor}
          disabled={guardando}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") guardar(valor);
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-1.5">
          {actual ? (
            <Button size="sm" variant="ghost" className="text-destructive" disabled={guardando} onClick={() => guardar("")}>
              Quitar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" disabled={guardando} onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={guardando || !valor.trim()} onClick={() => guardar(valor)}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
