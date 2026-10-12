"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardPos, Refresh2, MoneyRecive, Bank } from "@/lib/icons";
import { METODOS_TPV, MovimientoTpv, TpvFotoApi, TpvImporteApi, diaMadrid } from "@/lib/tpv";
import { CalendarioTpv } from "./calendario-tpv";
import { DiaDetalleVista } from "./dia-detalle-vista";

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

/** "AAAA-MM" del mes mostrado — para filtrar qué días entran en las
    tarjetas KPI de arriba, igual mes que el calendario de abajo. */
function clavesMes(mes: Date): string {
  return `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * TPV (antes separado de "Tarjetas", fusionados de vuelta en una sola
 * vista — petición del usuario, 2026-10-12: "son lo mismo, me equivoqué").
 * Calendario mensual primero (mismo patrón que Recogidas): cada día
 * muestra un resumen, y al entrar se sustituye el calendario por el
 * desglose completo de ese día (vista normal, no modal — petición del
 * usuario, 2026-10-12) con el total confirmado acumulado — ver
 * dia-detalle-vista.tsx.
 */
export default function TpvPage() {
  const [segunSistema, setSegunSistema] = useState<Record<string, Record<string, number>>>({});
  const [movimientos, setMovimientos] = useState<MovimientoTpv[]>([]);
  const [importes, setImportes] = useState<TpvImporteApi[]>([]);
  const [fotos, setFotos] = useState<TpvFotoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mesActual, setMesActual] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/tpv");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setSegunSistema(data.segunSistema);
      setMovimientos(data.movimientos as MovimientoTpv[]);
      setImportes(data.importes as TpvImporteApi[]);
      setFotos(data.fotos as TpvFotoApi[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const resumenMes = useMemo(() => {
    const prefijo = clavesMes(mesActual);
    let vendido = 0;
    for (const [dia, metodos] of Object.entries(segunSistema)) {
      if (!dia.startsWith(prefijo)) continue;
      for (const m of METODOS_TPV) vendido += metodos[m.value] || 0;
    }
    let confirmado = 0;
    for (const i of importes) {
      if (!i.fecha.startsWith(prefijo)) continue;
      confirmado += Number(i.importe_declarado) || 0;
    }
    vendido = Math.round(vendido * 100) / 100;
    confirmado = Math.round(confirmado * 100) / 100;
    return { vendido, confirmado, diferencia: Math.round((vendido - confirmado) * 100) / 100 };
  }, [segunSistema, importes, mesActual]);

  if (diaSeleccionado) {
    return (
      <div className="p-6">
        <DiaDetalleVista
          dia={diaSeleccionado}
          segunSistemaDia={segunSistema[diaSeleccionado] || {}}
          movimientosDia={movimientos.filter((m) => diaMadrid(m.fecha) === diaSeleccionado)}
          importesDia={importes.filter((i) => i.fecha === diaSeleccionado)}
          fotosDia={fotos.filter((f) => f.fecha === diaSeleccionado)}
          onVolver={() => setDiaSeleccionado(null)}
          onCambiado={cargar}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <CardPos className="size-5 text-purple-600" /> TPV
          </h1>
          <p className="text-sm text-muted-foreground">
            Cobros por tarjeta, Bizum, transferencia o efectivo — entra en un día para ver el desglose y confirmar lo que dice el banco.
          </p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Vendido (mes)</p>
              <p className="text-2xl font-bold tabular-nums">{cargando ? "…" : euros(resumenMes.vendido)}</p>
            </div>
            <CardPos className="size-8 text-primary/40" />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Confirmado (mes)</p>
              <p className="text-2xl font-bold tabular-nums text-green-600">{cargando ? "…" : euros(resumenMes.confirmado)}</p>
            </div>
            <MoneyRecive className="size-8 text-green-600/40" />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Diferencia (mes)</p>
              <p className={`text-2xl font-bold tabular-nums ${Math.abs(resumenMes.diferencia) <= 0.01 ? "text-green-600" : "text-amber-600"}`}>
                {euros(resumenMes.diferencia)}
              </p>
            </div>
            <Bank className="size-8 text-primary/40" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>
      )}

      {cargando ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : (
        <CalendarioTpv
          segunSistema={segunSistema}
          importes={importes}
          mesActual={mesActual}
          onCambiarMes={setMesActual}
          onSeleccionarDia={setDiaSeleccionado}
        />
      )}
    </div>
  );
}
