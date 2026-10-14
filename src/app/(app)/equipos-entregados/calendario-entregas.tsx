"use client";

import { useMemo } from "react";
import { ArrowLeft2, ArrowRight2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EquipoEntregado } from "@/lib/equipos-entregados";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Clave AAAA-MM-DD del día local — nunca vía toISOString() (convierte a UTC y puede saltar de día).
function claveFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esHoy(d: Date): boolean {
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

/**
 * Calendario mensual de equipos entregados — mismo esqueleto que el de Facturación del día: cada día muestra un
 * resumen (cuántos equipos salieron y de qué tipo) y al pulsarlo se abre el detalle de ese día.
 */
export function CalendarioEntregas({
  equipos,
  mesActual,
  onCambiarMes,
  onSeleccionarDia,
}: {
  equipos: EquipoEntregado[];
  /** Mes mostrado (controlado por la página, para que los KPIs resuman el mismo mes). */
  mesActual: Date;
  onCambiarMes: (mes: Date) => void;
  onSeleccionarDia: (dia: string) => void;
}) {
  const resumenPorDia = useMemo(() => {
    const out: Record<string, { total: number; local: number; mensajeria: number }> = {};
    for (const e of equipos) {
      const r = (out[e.dia] ||= { total: 0, local: 0, mensajeria: 0 });
      r.total++;
      if (e.tipoEntrega === "mensajeria") r.mensajeria++;
      else r.local++;
    }
    return out;
  }, [equipos]);

  const dias = useMemo(() => {
    const primerDiaMes = mesActual;
    const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
    const offsetInicio = (primerDiaMes.getDay() + 6) % 7; // lunes = 0
    const inicioGrid = new Date(primerDiaMes);
    inicioGrid.setDate(inicioGrid.getDate() - offsetInicio);
    const offsetFin = 6 - ((ultimoDiaMes.getDay() + 6) % 7);
    const finGrid = new Date(ultimoDiaMes);
    finGrid.setDate(finGrid.getDate() + offsetFin);
    const resultado: Date[] = [];
    const cursor = new Date(inicioGrid);
    while (cursor <= finGrid) {
      resultado.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return resultado;
  }, [mesActual]);

  const anioActual = new Date().getFullYear();
  const anios = [anioActual - 2, anioActual - 1, anioActual, anioActual + 1];

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Select value={String(mesActual.getMonth())} onValueChange={(v) => v && onCambiarMes(new Date(mesActual.getFullYear(), Number(v), 1))}>
            <SelectTrigger className="h-7 w-32 text-sm font-semibold" aria-label="Mes">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nombre, i) => (
                <SelectItem key={nombre} value={String(i)}>{nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(mesActual.getFullYear())} onValueChange={(v) => v && onCambiarMes(new Date(Number(v), mesActual.getMonth(), 1))}>
            <SelectTrigger className="h-7 w-20 text-sm font-semibold" aria-label="Año">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anios.map((anio) => (
                <SelectItem key={anio} value={String(anio)}>{anio}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => { const n = new Date(); onCambiarMes(new Date(n.getFullYear(), n.getMonth(), 1)); }}
          >
            Hoy
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => onCambiarMes(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))}>
            <ArrowLeft2 className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => onCambiarMes(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))}>
            <ArrowRight2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const clave = claveFecha(d);
          const resumen = resumenPorDia[clave];
          const delMes = d.getMonth() === mesActual.getMonth();
          return (
            <button
              key={clave}
              type="button"
              onClick={() => onSeleccionarDia(clave)}
              className={`min-h-24 border-b border-r p-1.5 text-left hover:bg-muted/40 [&:nth-child(7n)]:border-r-0 ${delMes ? "" : "bg-muted/20"} ${resumen && delMes ? "bg-primary/5" : ""}`}
            >
              <div
                className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs ${
                  esHoy(d) ? "bg-primary font-semibold text-primary-foreground" : delMes ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {d.getDate()}
              </div>
              {resumen && (
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold tabular-nums">
                    {resumen.total} {resumen.total === 1 ? "equipo" : "equipos"}
                  </p>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    {resumen.local > 0 && <span className="block text-emerald-700 dark:text-emerald-400">{resumen.local} en local</span>}
                    {resumen.mensajeria > 0 && <span className="block text-sky-700 dark:text-sky-400">{resumen.mensajeria} mensajería</span>}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
