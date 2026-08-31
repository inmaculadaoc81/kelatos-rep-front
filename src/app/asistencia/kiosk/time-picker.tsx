"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock } from "@/lib/icons";
import { cn } from "@/lib/utils";

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5); // pasos de 5 min

/** Selector de hora propio (dos columnas hora/minuto en un Popover) —
    reemplaza el <input type="time"> nativo, cuyo spinner varía muchísimo
    entre navegadores (ver captura del usuario) y desentona con el resto
    de la UI pulida del kiosco. Mismo criterio que DatePicker: solo para
    esta vista de cara al empleado, decisión explícita del usuario,
    2026-08-31. Pasos de 5 minutos — de sobra para una hora estimada o
    corregida a mano, y evita una lista de 60 minutos por scrollear. */
export function TimePicker({ value, onChange, placeholder = "--:--" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [hStr, mStr] = value ? value.split(":") : ["", ""];
  const h = hStr ? Number(hStr) : null;
  const m = mStr ? Number(mStr) : null;

  function set(hh: number, mm: number) {
    onChange(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className={cn(!value && "text-muted-foreground")}>{value || placeholder}</span>
            <Clock className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-36 p-0">
        <div className="grid grid-cols-2 divide-x">
          <div className="max-h-56 space-y-0.5 overflow-y-auto p-1">
            {HORAS.map((hh) => (
              <button
                key={hh}
                type="button"
                onClick={() => set(hh, m ?? 0)}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-center text-sm hover:bg-muted",
                  h === hh && "bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                {String(hh).padStart(2, "0")}
              </button>
            ))}
          </div>
          <div className="max-h-56 space-y-0.5 overflow-y-auto p-1">
            {MINUTOS.map((mm) => (
              <button
                key={mm}
                type="button"
                onClick={() => { set(h ?? 0, mm); setAbierto(false); }}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-center text-sm hover:bg-muted",
                  m === mm && "bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                {String(mm).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
