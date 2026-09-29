"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft2, ArrowRight2, Calendar } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useTareas } from "../use-tareas";
import { TareaDetalleDialog } from "../tarea-detalle-dialog";
import type { EstadoTarea } from "@/lib/tareas";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const COLOR_ESTADO: Record<EstadoTarea, string> = {
  pendiente: "bg-amber-500",
  en_progreso: "bg-sky-500",
  finalizada: "bg-emerald-500",
};

function aFecha(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Rejilla de 6 semanas (Lunes-Domingo) que cubre el mes indicado — siempre 42
    días, así la altura no salta de un mes a otro. */
function diasDelMes(mesBase: Date): Date[] {
  const primero = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
  const diaSemana = (primero.getDay() + 6) % 7; // 0 = lunes
  const inicio = new Date(primero);
  inicio.setDate(primero.getDate() - diaSemana);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

export default function CalendarioTareasPage() {
  const { tareas, empleados, cargando, actualizarEnLista, quitarDeLista } = useTareas();
  const [mesBase, setMesBase] = useState(() => new Date());
  const [tareaAbiertaId, setTareaAbiertaId] = useState<number | null>(null);
  const hoy = aFecha(new Date());

  const porFecha = useMemo(() => {
    const m = new Map<string, typeof tareas>();
    for (const t of tareas) {
      if (!m.has(t.fechaInicio)) m.set(t.fechaInicio, []);
      m.get(t.fechaInicio)!.push(t);
    }
    return m;
  }, [tareas]);

  const dias = useMemo(() => diasDelMes(mesBase), [mesBase]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Calendario</h1>
          <p className="text-sm text-muted-foreground">Las tareas, según su fecha de inicio.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" onClick={() => setMesBase((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
            <ArrowLeft2 className="size-4" />
          </Button>
          <span className="w-40 text-center text-sm font-medium capitalize">{MESES[mesBase.getMonth()]} {mesBase.getFullYear()}</span>
          <Button variant="outline" size="icon-sm" onClick={() => setMesBase((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
            <ArrowRight2 className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMesBase(new Date())}>
            <Calendar className="size-3.5" /> Hoy
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {DIAS.map((d) => (<div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">{d}</div>))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const clave = aFecha(d);
            const tareasDelDia = porFecha.get(clave) || [];
            const delMes = d.getMonth() === mesBase.getMonth();
            const esHoy = clave === hoy;
            return (
              <div key={clave} className={cn("min-h-24 border-r border-b p-1.5 last:border-r-0", !delMes && "bg-muted/20")}>
                <span className={cn(
                  "mb-1 inline-flex size-5 items-center justify-center rounded-full text-xs",
                  esHoy ? "bg-primary font-semibold text-primary-foreground" : delMes ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {d.getDate()}
                </span>
                <div className="space-y-1">
                  {tareasDelDia.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTareaAbiertaId(t.id)}
                      className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-accent"
                      title={t.titulo}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", COLOR_ESTADO[t.estado])} />
                      <span className="truncate">{t.titulo}</span>
                    </button>
                  ))}
                  {tareasDelDia.length > 3 && (
                    <p className="px-1 text-[10px] text-muted-foreground">+{tareasDelDia.length - 3} más</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!cargando && tareas.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay ninguna tarea creada.</p>}

      <TareaDetalleDialog
        tareaId={tareaAbiertaId}
        open={tareaAbiertaId !== null}
        onOpenChange={(o) => !o && setTareaAbiertaId(null)}
        empleados={empleados}
        onCambiada={actualizarEnLista}
        onEliminada={quitarDeLista}
      />
    </div>
  );
}
