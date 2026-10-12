"use client";

import { useMemo } from "react";
import { ArrowLeft2, ArrowRight2, TickCircle, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { METODOS_TPV, TpvImporteApi } from "@/lib/tpv";

const TOLERANCIA = 0.01;

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

// Mismo cálculo de clave/hoy que calendario-recogidas.tsx — nunca vía
// toISOString() (convierte a UTC y puede saltar de día).
function claveFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esHoy(d: Date): boolean {
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

type CuadreDia = "vacio" | "ok" | "pendiente";

/**
 * Calendario mensual de TPV — mismo esqueleto que CalendarioRecogidas
 * (grid, navegación de mes/año), pero cada celda muestra un resumen del
 * día (total vendido + si ya está todo confirmado) en vez de una lista de
 * eventos, y al hacer click abre el desglose completo de ese día en vez
 * de un popover. Petición del usuario, 2026-10-12: "como está la vista de
 * recogidas... que salga como un resumen en cada día, como una previa".
 */
export function CalendarioTpv({
  segunSistema,
  importes,
  mesActual,
  onCambiarMes,
  onSeleccionarDia,
}: {
  segunSistema: Record<string, Record<string, number>>;
  importes: TpvImporteApi[];
  /** Mes mostrado (controlado por la página, para que las tarjetas KPI de
      arriba puedan resumir el mismo mes que el calendario). */
  mesActual: Date;
  onCambiarMes: (mes: Date) => void;
  onSeleccionarDia: (dia: string) => void;
}) {
  const importePorDiaMetodo = useMemo(() => {
    const out: Record<string, TpvImporteApi> = {};
    for (const i of importes) out[`${i.fecha}|${i.metodo}`] = i;
    return out;
  }, [importes]);

  const resumenPorDia = useMemo(() => {
    const out: Record<string, { vendido: number; cuadre: CuadreDia }> = {};
    const dias = new Set([...Object.keys(segunSistema), ...importes.map((i) => i.fecha)]);
    for (const dia of dias) {
      const metodosRelevantes = METODOS_TPV.filter(
        (m) => Math.abs(segunSistema[dia]?.[m.value] || 0) > TOLERANCIA || !!importePorDiaMetodo[`${dia}|${m.value}`]
      );
      if (metodosRelevantes.length === 0) continue;
      const vendido = METODOS_TPV.reduce((acc, m) => acc + (segunSistema[dia]?.[m.value] || 0), 0);
      const todoConfirmado = metodosRelevantes.every((m) => {
        const declarado = importePorDiaMetodo[`${dia}|${m.value}`];
        if (!declarado) return false;
        const sistema = segunSistema[dia]?.[m.value] || 0;
        return Math.abs(Number(declarado.importe_declarado) - sistema) <= TOLERANCIA;
      });
      out[dia] = { vendido: Math.round(vendido * 100) / 100, cuadre: todoConfirmado ? "ok" : "pendiente" };
    }
    return out;
  }, [segunSistema, importes, importePorDiaMetodo]);

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
  const anios = [anioActual - 1, anioActual, anioActual + 1, anioActual + 2];

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
              className={`min-h-24 border-b border-r p-1.5 text-left hover:bg-muted/40 [&:nth-child(7n)]:border-r-0 ${delMes ? "" : "bg-muted/20"}`}
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
                  <p className="text-xs font-semibold tabular-nums">{euros(resumen.vendido)}</p>
                  <p className={`flex items-center gap-1 text-[11px] font-medium ${resumen.cuadre === "ok" ? "text-green-600" : "text-amber-600"}`}>
                    {resumen.cuadre === "ok" ? <TickCircle className="size-3" /> : <Warning2 className="size-3" />}
                    {resumen.cuadre === "ok" ? "Confirmado" : "Pendiente"}
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
