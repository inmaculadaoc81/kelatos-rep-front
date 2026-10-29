"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft2, ArrowRight2, Book1, DocumentDownload, Refresh2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { descargarCsv } from "@/lib/reporte-facturas";
import { apiC, eur, num, type AsientoResumen, type EstadoAsiento } from "@/lib/contabilidad";
import { Cabecera, CajaError, EstadoBadge, FiltroFechas, InfoVista, Kpi, rangoAnioActual } from "../_ui";
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

const OPCIONES_POR_PAGINA = [25, 50, 100, 300];
const OPERACIONES: [RegExp, string, string][] = [
  [/^rectificativa/i, "Rectificativa", "bg-amber-500/10 text-amber-700 dark:text-amber-400"],
  [/^devoluci/i, "Devolución", "bg-orange-500/10 text-orange-700 dark:text-orange-400"],
  [/^cobro/i, "Cobro", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"],
  [/^factura/i, "Factura", "bg-sky-500/10 text-sky-700 dark:text-sky-400"],
  [/^ticket/i, "Ticket", "bg-violet-500/10 text-violet-700 dark:text-violet-400"],
  [/^(liquidaci|comisi|cuota)/i, "Banco / TPV", "bg-teal-500/10 text-teal-700 dark:text-teal-400"],
  [/^(compra|pago|dua|importaci)/i, "Compra", "bg-slate-500/10 text-slate-700 dark:text-slate-300"],
];
const operacionDe = (concepto: string) => OPERACIONES.find(([re]) => re.test(concepto.trim())) || null;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function fechaLarga(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const celdaCsv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function DiarioPage() {
  const [{ desde, hasta }, setRango] = useState(rangoAnioActual);
  const [borradores, setBorradores] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const [asientos, setAsientos] = useState<AsientoDiario[]>([]);
  const [totales, setTotales] = useState({ asientos: 0, debe: 0, haber: 0 });
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  useEffect(() => setPagina(1), [desde, hasta, borradores, porPagina]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await apiC<{ asientos: AsientoDiario[]; totales: { asientos: number; debe: number; haber: number } }>("libro-diario", {
        query: { desde, hasta, borradores, limit: porPagina, offset: (pagina - 1) * porPagina },
      });
      setAsientos(d.asientos);
      setTotales(d.totales);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, borradores, pagina, porPagina]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(totales.asientos / porPagina));

  // Exporta TODO el periodo (no solo la página) con una línea por apunte, listo para Excel (separador «;», coma decimal).
  async function exportarCsv() {
    setExportando(true);
    try {
      const todos: AsientoDiario[] = [];
      for (let offset = 0; ; offset += 300) {
        const d = await apiC<{ asientos: AsientoDiario[] }>("libro-diario", { query: { desde, hasta, borradores, limit: 300, offset } });
        todos.push(...d.asientos);
        if (d.asientos.length < 300) break;
      }
      if (!todos.length) return toast.error("No hay asientos que exportar en este periodo");
      const cab = ["Asiento", "Fecha", "Estado", "Concepto del asiento", "Cuenta", "Nombre de la cuenta", "Debe", "Haber"];
      const filas = todos.flatMap((a) => a.lineas.map((l) => [a.numero || `#${a.id}`, a.fecha, a.estado, a.concepto, l.subcuenta_codigo || l.cuenta_codigo, l.subcuenta_nombre || l.cuenta_nombre, l.debe ? String(l.debe).replace(".", ",") : "", l.haber ? String(l.haber).replace(".", ",") : ""]));
      descargarCsv("﻿" + [cab, ...filas].map((f) => f.map(celdaCsv).join(";")).join("\r\n"), `libro-diario-${desde}_a_${hasta}.csv`);
      toast.success(`${todos.length} asiento(s) exportados (${filas.length} apuntes)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-3 p-6">
      <Cabecera
        icono={<Book1 className="size-4.5" />}
        titulo="Libro Diario"
        descripcion="Todos los asientos en orden cronológico, con sus apuntes al Debe y al Haber"
        acciones={
          <>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={exportando || totales.asientos === 0} onClick={exportarCsv} title="Descarga todo el periodo, un apunte por línea">
              <DocumentDownload className="size-4" /> {exportando ? "Exportando…" : "Exportar CSV"}
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
              <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />
      <InfoVista>Lista los asientos ya contabilizados por orden cronológico, exactamente como se registraron. Ejemplo: en la fecha de una venta aparece el asiento con su cargo a Caja y su abono a Ventas e IVA, uno detrás de otro con el resto del día. Las cuentas que están en el Haber van sangradas, como en un libro diario clásico.</InfoVista>
      <div className="flex flex-wrap items-center gap-3">
        <FiltroFechas desde={desde} hasta={hasta} onChange={(d, h) => setRango({ desde: d, hasta: h })} />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={borradores} onCheckedChange={(c) => setBorradores(!!c)} /> Incluir borradores y validados
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
        <Kpi titulo="Asientos" valor={String(totales.asientos)} color="" />
        <Kpi titulo="Total Debe" valor={num(totales.debe)} color="" />
        <Kpi titulo="Total Haber" valor={num(totales.haber)} color={Math.abs(totales.debe - totales.haber) < 0.005 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"} />
      </div>
      <CajaError mensaje={error} />

      {cargando && <Skeleton className="h-48 w-full" />}
      {!cargando && asientos.length === 0 && <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">No hay asientos contabilizados en este periodo.</div>}

      {!cargando && asientos.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-card">
          {/* Cabecera de columnas, fija al desplazarse */}
          <div className="sticky top-0 z-10 grid grid-cols-[8rem_1fr_7.5rem_7.5rem] items-center border-b bg-muted/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
            <span>Cuenta</span><span>Descripción</span><span className="text-right">Debe</span><span className="text-right">Haber</span>
          </div>
          {asientos.map((a, i) => {
            const nuevoDia = i === 0 || asientos[i - 1].fecha.slice(0, 10) !== a.fecha.slice(0, 10);
            const debe = r2(a.lineas.reduce((s, l) => s + l.debe, 0));
            const haber = r2(a.lineas.reduce((s, l) => s + l.haber, 0));
            const op = operacionDe(a.concepto);
            return (
              <Fragment key={a.id}>
                {nuevoDia && (
                  <div className="border-b bg-sky-500/5 px-3 py-1 text-xs font-medium capitalize text-sky-800 dark:text-sky-300">{fechaLarga(a.fecha)}</div>
                )}
                <div className="border-b last:border-b-0">
                  <button type="button" className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 bg-muted/40 px-3 py-1.5 text-left hover:bg-muted/70" onClick={() => setDetalleId(a.id)}>
                    <span className="font-semibold tabular-nums">{a.numero || `#${a.id}`}</span>
                    {op && <span className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${op[2]}`}>{op[1]}</span>}
                    <span className="min-w-0 flex-1 truncate text-sm" title={a.concepto}>{a.concepto}</span>
                    <EstadoBadge estado={a.estado as EstadoAsiento} />
                  </button>
                  {a.lineas.map((l) => (
                    <div key={l.orden} className="grid grid-cols-[8rem_1fr_7.5rem_7.5rem] items-center border-t border-dashed px-3 py-1 text-sm">
                      <span className="font-medium tabular-nums">{l.subcuenta_codigo || l.cuenta_codigo}</span>
                      <span className={`truncate text-muted-foreground ${l.haber > 0 && !l.debe ? "pl-6" : ""}`}>{l.haber > 0 && !l.debe ? "a " : ""}{l.subcuenta_nombre || l.cuenta_nombre}</span>
                      <span className="text-right tabular-nums">{l.debe ? num(l.debe) : ""}</span>
                      <span className="text-right tabular-nums">{l.haber ? num(l.haber) : ""}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-[8rem_1fr_7.5rem_7.5rem] items-center border-t bg-muted/20 px-3 py-0.5 text-xs text-muted-foreground">
                    <span /><span className={Math.abs(debe - haber) < 0.005 ? "" : "font-medium text-red-600"}>{Math.abs(debe - haber) < 0.005 ? "Asiento cuadrado" : `Descuadre de ${eur(Math.abs(debe - haber))}`}</span>
                    <span className="text-right tabular-nums">{num(debe)}</span><span className="text-right tabular-nums">{num(haber)}</span>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{totales.asientos === 0 ? "0 asientos" : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, totales.asientos)} de ${totales.asientos} asientos`}</span>
          <label className="flex items-center gap-1.5 text-xs">
            Asientos por página
            <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v) || 50)}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{OPCIONES_POR_PAGINA.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}><ArrowLeft2 className="size-4" /></Button>
          <span className="px-2 tabular-nums">{pagina} / {totalPaginas}</span>
          <Button variant="outline" size="icon" className="size-8" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}><ArrowRight2 className="size-4" /></Button>
        </div>
      </div>

      <AsientoDialog id={detalleId} onClose={() => setDetalleId(null)} onCambio={cargar} onEditar={() => setDetalleId(null)} />
    </div>
  );
}
