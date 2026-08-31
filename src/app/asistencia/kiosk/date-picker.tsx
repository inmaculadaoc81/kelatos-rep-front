"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft2, ArrowRight2 } from "@/lib/icons";
import { cn } from "@/lib/utils";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Selector de fecha propio (calendario en un Popover) para el kiosco —
    reemplaza el <input type="date"> nativo, cuyo desplegable varía muchísimo
    entre navegadores y desentona con el resto de la UI pulida del kiosco.
    Deliberadamente distinto al resto de Kelatos (que sí usa inputs nativos
    de fecha en todas partes) — decisión explícita del usuario, 2026-08-31,
    solo para esta vista de cara al empleado. */
export function DatePicker({ value, onChange, placeholder = "Selecciona una fecha" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const seleccionado = parseISO(value);
  const [abierto, setAbierto] = useState(false);
  const [mesVista, setMesVista] = useState(() => seleccionado || new Date());

  const anio = mesVista.getFullYear();
  const mes = mesVista.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const offset = (primerDia.getDay() + 6) % 7; // 0 = lunes
  const celdas: (Date | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: ultimoDia.getDate() }, (_, i) => new Date(anio, mes, i + 1)),
  ];
  const hoy = new Date();

  return (
    <Popover open={abierto} onOpenChange={(o) => { setAbierto(o); if (o) setMesVista(seleccionado || new Date()); }}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className={cn(!seleccionado && "text-muted-foreground")}>
              {seleccionado ? seleccionado.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : placeholder}
            </span>
            <CalendarIcon className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-64 p-3">
        <div className="flex items-center justify-between pb-2">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMesVista(new Date(anio, mes - 1, 1))}>
            <ArrowLeft2 className="size-4" />
          </Button>
          <p className="text-sm font-medium">{MESES[mes]} {anio}</p>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMesVista(new Date(anio, mes + 1, 1))}>
            <ArrowRight2 className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
          {DIAS_SEMANA.map((d) => <div key={d} className="py-1 font-medium">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {celdas.map((d, i) => d ? (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(toISO(d)); setAbierto(false); }}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-muted",
                seleccionado && mismoDia(d, seleccionado) ? "bg-primary text-primary-foreground hover:bg-primary" :
                  mismoDia(d, hoy) ? "font-semibold text-primary" : ""
              )}
            >
              {d.getDate()}
            </button>
          ) : <div key={i} />)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
