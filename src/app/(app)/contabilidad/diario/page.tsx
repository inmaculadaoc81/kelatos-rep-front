"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft2, ArrowRight2, Book1, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { apiC, fechaCorta, num, type AsientoResumen, type EstadoAsiento } from "@/lib/contabilidad";
import { Cabecera, CajaError, EstadoBadge, FiltroFechas, Kpi, rangoAnioActual } from "../_ui";
import { AsientoDialog } from "../asiento-dialog";

interface LineaDiario {
  asiento_id: number;
  orden: number;
  cuenta_codigo: string;
  cuenta_nombre: string;
  subcuenta_codigo: string | null;
  subcuenta_nombre: string | null;
  debe: number;
  haber: number;
  concepto: string;
}
type AsientoDiario = AsientoResumen & { lineas: LineaDiario[] };

const POR_PAGINA = 50;

export default function DiarioPage() {
  const [{ desde, hasta }, setRango] = useState(rangoAnioActual);
  const [borradores, setBorradores] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [asientos, setAsientos] = useState<AsientoDiario[]>([]);
  const [totales, setTotales] = useState({ asientos: 0, debe: 0, haber: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  useEffect(() => setPagina(1), [desde, hasta, borradores]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ asientos: AsientoDiario[]; totales: { asientos: number; debe: number; haber: number } }>("libro-diario", {
        query: { desde, hasta, borradores, limit: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA },
      });
      setAsientos(d.asientos);
      setTotales(d.totales);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, borradores, pagina]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(totales.asientos / POR_PAGINA));

  return (
    <div className="space-y-3">
      <Cabecera
        icono={<Book1 className="size-4.5" />}
        titulo="Libro Diario"
        descripcion="Todos los asientos en orden cronológico, con sus apuntes al Debe y al Haber"
        acciones={
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <FiltroFechas desde={desde} hasta={hasta} onChange={(d, h) => setRango({ desde: d, hasta: h })} />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={borradores} onCheckedChange={(c) => setBorradores(!!c)} /> Incluir borradores y validados
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
        <Kpi titulo="Asientos" valor={String(totales.asientos)} color="" />
        <Kpi titulo="Total Debe" valor={num(totales.debe)} color="" />
        <Kpi titulo="Total Haber" valor={num(totales.haber)} color={totales.debe === totales.haber ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"} />
      </div>
      <CajaError mensaje={error} />

      {cargando && <Skeleton className="h-48 w-full" />}
      {!cargando && asientos.length === 0 && <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">No hay asientos contabilizados en este periodo.</div>}

      <div className="space-y-2">
        {!cargando &&
          asientos.map((a) => (
            <div key={a.id} className="overflow-hidden rounded-lg border bg-card">
              <button type="button" className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 bg-muted/40 px-3 py-1.5 text-left hover:bg-muted/70" onClick={() => setDetalleId(a.id)}>
                <span className="font-semibold tabular-nums">{a.numero || `#${a.id}`}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{fechaCorta(a.fecha)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{a.concepto}</span>
                <EstadoBadge estado={a.estado as EstadoAsiento} />
              </button>
              <table className="w-full text-sm">
                <tbody>
                  {a.lineas.map((l) => (
                    <tr key={l.orden} className="border-t">
                      <td className="w-32 px-3 py-1 font-medium tabular-nums">{l.subcuenta_codigo || l.cuenta_codigo}</td>
                      <td className="px-2 py-1 text-muted-foreground">{l.subcuenta_nombre || l.cuenta_nombre}</td>
                      <td className="w-28 px-3 py-1 text-right tabular-nums">{l.debe ? num(l.debe) : ""}</td>
                      <td className="w-28 px-3 py-1 text-right tabular-nums">{l.haber ? num(l.haber) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
        <Button variant="outline" size="icon" className="size-8" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}><ArrowLeft2 className="size-4" /></Button>
        <span className="px-2 tabular-nums">{pagina} / {totalPaginas}</span>
        <Button variant="outline" size="icon" className="size-8" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}><ArrowRight2 className="size-4" /></Button>
      </div>

      <AsientoDialog id={detalleId} onClose={() => setDetalleId(null)} onCambio={cargar} onEditar={() => setDetalleId(null)} />
    </div>
  );
}
