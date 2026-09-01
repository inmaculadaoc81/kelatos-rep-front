"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, CloseCircle, ExportSquare, DocumentDownload, ArrowLeft2, ArrowLeft3, ArrowRight2, ArrowRight3, Clock } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TipoFactura } from "@/lib/facturas-cliente";
import { FacturaConDesglose, RF_TIPOS_FILTRABLES, RF_TIPO_ESTILO, generarCsvReporte, descargarCsv, numeroDocumento } from "@/lib/reporte-facturas";
import { ColumnaFiltro } from "../facturas-clientes/columna-filtro";
import { ColumnaFiltroRango, RangoFiltro } from "./columna-filtro-rango";
import { HistorialExportacionesDialog } from "./historial-exportaciones-dialog";
import { fechaMadrid } from "@/lib/reportes";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// fecha_factura/etc. son timestamptz (ISO en UTC) — truncar con slice(0,10)
// se queda con el día UTC, no el de Madrid (una factura de las 00:21 del
// día 15 llega como "...T22:21...Z" del día 14 y se mostraba como 14, no
// 15). fechaMadrid() convierte primero al día calendario correcto.
function fechaCorta(iso: string | null): string {
  const dia = fechaMadrid(iso);
  if (!dia) return "—";
  const p = dia.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(-2)}` : "—";
}

type ColumnaRf = "num" | "fecha" | "cliente" | "nif";
const COLUMNAS_RF: ColumnaRf[] = ["num", "fecha", "cliente", "nif"];

function valorColumnaRf(f: FacturaConDesglose, col: ColumnaRf): string {
  switch (col) {
    case "num":
      return f.numero.includes("-") ? f.numero.split("-")[1] : f.numero;
    case "fecha":
      return fechaCorta(f.fecha);
    case "cliente":
      return (f.codigoCliente ? `${f.codigoCliente} - ` : "") + (f.cliente || "—");
    case "nif":
      return f.dniCif || "—";
  }
}

const RF_FILAS_OPCIONES = ["15", "20", "50", "100", "0"];

const ESTADOS_RF = ["Pendiente", "Cobrada", "Devolución"] as const;

export default function ReporteFacturasPage() {
  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 5 }, (_, i) => anioActual - i);

  const [ejercicio, setEjercicio] = useState(anioActual);
  const [fechaDesde, setFechaDesde] = useState(`${anioActual}-01-01`);
  const [fechaHasta, setFechaHasta] = useState(`${anioActual}-12-31`);

  const [datos, setDatos] = useState<{ fechaDesde: string; fechaHasta: string; facturas: FacturaConDesglose[] } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [docDesde, setDocDesde] = useState(0);
  const [docHasta, setDocHasta] = useState(999999);
  const [serie1, setSerie1] = useState(true);
  const [serie3, setSerie3] = useState(true);
  const [serie4, setSerie4] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFactura | "">("");
  const [estadoFiltro, setEstadoFiltro] = useState<typeof ESTADOS_RF[number] | "">("");
  const [clienteFiltro, setClienteFiltro] = useState("");

  const [filtrosCol, setFiltrosCol] = useState<Partial<Record<"num" | "fecha" | "cliente" | "nif", Set<string>>>>({});
  const [filtroBase, setFiltroBase] = useState<RangoFiltro | null>(null);
  const [filtroTotal, setFiltroTotal] = useState<RangoFiltro | null>(null);

  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(20);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  async function cargar(desde: string, hasta: string) {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/reporte-facturas?fechaDesde=${desde}&fechaHasta=${hasta}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDatos(data);
      setPagina(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(fechaDesde, fechaHasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarEjercicio(v: string) {
    const y = parseInt(v, 10);
    setEjercicio(y);
    const desde = `${y}-01-01`;
    const hasta = `${y}-12-31`;
    setFechaDesde(desde);
    setFechaHasta(hasta);
    cargar(desde, hasta);
  }

  const filtradas = useMemo(() => {
    if (!datos) return [];
    return datos.facturas.filter((f) => {
      if (f.serie === "1" && !serie1) return false;
      if (f.serie === "3" && !serie3) return false;
      if (f.serie === "4" && !serie4) return false;
      const numDoc = numeroDocumento(f.numero);
      if (numDoc < docDesde || numDoc > docHasta) return false;
      if (tipoFiltro && f.tipo !== tipoFiltro) return false;
      if (estadoFiltro) {
        const est = f.estadoFactura || (f.tipo === "rectificativa" ? "Devolución" : "");
        if (!(estadoFiltro === "Pendiente" && est === "") && est !== estadoFiltro) return false;
      }
      if (clienteFiltro.trim()) {
        const q = clienteFiltro.trim().toLowerCase();
        const hayNombre = (f.cliente || "").toLowerCase().includes(q);
        const hayNif = (f.dniCif || "").toLowerCase().includes(q);
        if (!hayNombre && !hayNif) return false;
      }
      return true;
    });
  }, [datos, serie1, serie3, serie4, docDesde, docHasta, tipoFiltro, estadoFiltro, clienteFiltro]);

  function pasaFiltrosColumna(f: FacturaConDesglose, excluir?: string): boolean {
    for (const col of COLUMNAS_RF) {
      if (col === excluir) continue;
      const s = filtrosCol[col];
      if (s && s.size && !s.has(valorColumnaRf(f, col))) return false;
    }
    if (excluir !== "base" && filtroBase) {
      if (filtroBase.min != null && f.baseImponible < filtroBase.min) return false;
      if (filtroBase.max != null && f.baseImponible > filtroBase.max) return false;
    }
    if (excluir !== "total" && filtroTotal) {
      if (filtroTotal.min != null && f.totalConIva < filtroTotal.min) return false;
      if (filtroTotal.max != null && f.totalConIva > filtroTotal.max) return false;
    }
    return true;
  }

  const visibles = useMemo(
    () => filtradas.filter((f) => pasaFiltrosColumna(f)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtradas, filtrosCol, filtroBase, filtroTotal]
  );

  function opcionesColumna(col: ColumnaRf): string[] {
    const base = filtradas.filter((f) => pasaFiltrosColumna(f, col));
    const vistos = new Set<string>();
    const vals: string[] = [];
    for (const f of base) {
      const v = valorColumnaRf(f, col);
      if (!vistos.has(v)) {
        vistos.add(v);
        vals.push(v);
      }
    }
    vals.sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    return vals;
  }

  function aplicarFiltroCol(col: ColumnaRf, seleccion: Set<string> | null) {
    setFiltrosCol((prev) => {
      const siguiente = { ...prev };
      if (seleccion === null) delete siguiente[col];
      else siguiente[col] = seleccion;
      return siguiente;
    });
    setPagina(1);
  }

  const totalPaginas = filasPorPagina > 0 ? Math.max(1, Math.ceil(visibles.length / filasPorPagina)) : 1;
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = filasPorPagina > 0 ? (paginaSegura - 1) * filasPorPagina : 0;
  const fin = filasPorPagina > 0 ? Math.min(inicio + filasPorPagina, visibles.length) : visibles.length;
  const paginaActual = visibles.slice(inicio, fin);

  const totales = useMemo(
    () =>
      visibles.reduce(
        (acc, f) => {
          acc.base += f.baseImponible;
          acc.iva += f.iva;
          acc.total += f.totalConIva;
          return acc;
        },
        { base: 0, iva: 0, total: 0 }
      ),
    [visibles]
  );

  const totalesPorTipo = useMemo(() => {
    const mapa: Partial<Record<TipoFactura, { base: number; iva: number; total: number; count: number }>> = {};
    for (const f of visibles) {
      const acc = mapa[f.tipo] ?? { base: 0, iva: 0, total: 0, count: 0 };
      acc.base += f.baseImponible;
      acc.iva += f.iva;
      acc.total += f.totalConIva;
      acc.count += 1;
      mapa[f.tipo] = acc;
    }
    return Object.entries(mapa) as [TipoFactura, { base: number; iva: number; total: number; count: number }][];
  }, [visibles]);

  const filtrosActivos =
    (docDesde > 0 ? 1 : 0) +
    (docHasta < 999999 ? 1 : 0) +
    (!serie1 ? 1 : 0) +
    (!serie3 ? 1 : 0) +
    (!serie4 ? 1 : 0) +
    (tipoFiltro ? 1 : 0) +
    (estadoFiltro ? 1 : 0) +
    (clienteFiltro.trim() ? 1 : 0);

  function limpiarFiltros() {
    setDocDesde(0);
    setDocHasta(999999);
    setSerie1(true);
    setSerie3(true);
    setSerie4(true);
    setTipoFiltro("");
    setEstadoFiltro("");
    setClienteFiltro("");
    setPagina(1);
  }

  function exportarCsv() {
    if (!datos || !visibles.length) return;
    const series: string[] = [];
    if (serie1) series.push("1");
    if (serie3) series.push("3");
    if (serie4) series.push("4");
    const seriesFinal = series.length ? series : ["1", "3", "4"];
    const csv = generarCsvReporte(visibles, {
      fechaDesde: datos.fechaDesde,
      fechaHasta: datos.fechaHasta,
      series: seriesFinal,
      docDesde,
      docHasta,
      usuario: "",
    });
    descargarCsv(csv, `ReporteFacturas_${datos.fechaDesde.replace(/-/g, "")}_${datos.fechaHasta.replace(/-/g, "")}.csv`);

    // Constancia del historial de exportaciones — best-effort, nunca bloquea la descarga.
    fetch("/api/reporte-facturas/exportaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fechaDesde: datos.fechaDesde,
        fechaHasta: datos.fechaHasta,
        series: seriesFinal,
        docDesde,
        docHasta,
        filtroTexto: clienteFiltro.trim(),
        numFacturas: visibles.length,
        totalExportado: visibles.reduce((s, f) => s + f.totalConIva, 0),
      }),
    }).catch(() => {});
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ExportSquare className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Reporte de Facturas</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => cargar(fechaDesde, fechaHasta)}>
            <Refresh2 className={cn("size-4", cargando && "animate-spin")} /> Actualizar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setHistorialAbierto(true)}>
            <Clock className="size-4" /> Historial
          </Button>
          {visibles.length > 0 && (
            <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={exportarCsv}>
              <DocumentDownload className="size-3.5" /> CSV
            </Button>
          )}
          <Button size="sm" variant="secondary" disabled title="PDF no disponible" className="cursor-not-allowed opacity-50">
            PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar el reporte: {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Ejercicio:</label>
          <Select value={String(ejercicio)} onValueChange={(v) => v && cambiarEjercicio(v)}>
            <SelectTrigger className="h-8 w-22 text-xs">
              <SelectValue>{(v: string) => v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {anios.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Fechas:</label>
          <Input type="date" className="h-8 w-36 text-xs" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          <span className="text-xs text-muted-foreground">a</span>
          <Input type="date" className="h-8 w-36 text-xs" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground" title="Filtra por el número secuencial de la factura. Es un filtro local, no recarga datos.">
            Nº doc:
          </label>
          <Input
            type="number"
            className="h-8 w-18 text-center text-xs"
            value={docDesde}
            onChange={(e) => setDocDesde(parseInt(e.target.value, 10) || 0)}
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Input
            type="number"
            className="h-8 w-20 text-center text-xs"
            value={docHasta}
            onChange={(e) => setDocHasta(parseInt(e.target.value, 10) || 999999)}
          />
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-muted-foreground">Series:</label>
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={serie1} onCheckedChange={(c) => setSerie1(c === true)} /> Serie 1
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={serie3} onCheckedChange={(c) => setSerie3(c === true)} /> Serie 3
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={serie4} onCheckedChange={(c) => setSerie4(c === true)} /> Serie 4
          </label>
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Tipo:</label>
          <Select value={tipoFiltro || "__todos__"} onValueChange={(v) => setTipoFiltro(!v || v === "__todos__" ? "" : (v as TipoFactura))}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue>
                {(v: string) => (v === "__todos__" ? "Todos" : RF_TIPO_ESTILO[v as TipoFactura]?.label ?? v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos</SelectItem>
              {RF_TIPOS_FILTRABLES.map((t) => (
                <SelectItem key={t} value={t}>
                  {RF_TIPO_ESTILO[t]?.label ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Estado:</label>
          <Select value={estadoFiltro || "__todos__"} onValueChange={(v) => setEstadoFiltro(!v || v === "__todos__" ? "" : (v as typeof estadoFiltro))}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue>{(v: string) => (v === "__todos__" ? "Todos" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos</SelectItem>
              {ESTADOS_RF.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Cliente:</label>
          <div className="relative w-44">
            <SearchNormal1 className="absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Nombre o NIF…" className="h-8 pl-6 text-xs" value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)} />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {filtrosActivos > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={limpiarFiltros}>
              <CloseCircle className="size-3.5" /> Limpiar
              <span className="rounded-full bg-amber-400 px-1.5 text-[.7rem] font-semibold text-amber-950">{filtrosActivos}</span>
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => cargar(fechaDesde, fechaHasta)}>
            <SearchNormal1 className="size-3.5" /> Aplicar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-sky-50 dark:bg-sky-950/40">
                <TableHead className="w-10">S.</TableHead>
                <TableHead>
                  <span className="inline-flex items-center">
                    Num.
                    <ColumnaFiltro opciones={opcionesColumna("num")} seleccion={filtrosCol.num ?? null} onAplicar={(s) => aplicarFiltroCol("num", s)} />
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  <span className="inline-flex items-center">
                    Fecha
                    <ColumnaFiltro opciones={opcionesColumna("fecha")} seleccion={filtrosCol.fecha ?? null} onAplicar={(s) => aplicarFiltroCol("fecha", s)} />
                  </span>
                </TableHead>
                <TableHead>
                  <span className="inline-flex items-center">
                    Cliente
                    <ColumnaFiltro opciones={opcionesColumna("cliente")} seleccion={filtrosCol.cliente ?? null} onAplicar={(s) => aplicarFiltroCol("cliente", s)} />
                  </span>
                </TableHead>
                <TableHead>
                  <span className="inline-flex items-center">
                    N.I.F
                    <ColumnaFiltro opciones={opcionesColumna("nif")} seleccion={filtrosCol.nif ?? null} onAplicar={(s) => aplicarFiltroCol("nif", s)} />
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center">
                    Base
                    <ColumnaFiltroRango seleccion={filtroBase} onAplicar={(r) => { setFiltroBase(r); setPagina(1); }} />
                  </span>
                </TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Rec.</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center">
                    Total
                    <ColumnaFiltroRango seleccion={filtroTotal} onAplicar={(r) => { setFiltroTotal(r); setPagina(1); }} />
                  </span>
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!cargando && paginaActual.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No hay facturas con los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}

              {!cargando &&
                paginaActual.map((f, i) => {
                  const numPart = f.numero.includes("-") ? f.numero.split("-")[1] : f.numero;
                  const clienteTxt = (f.codigoCliente ? `${f.codigoCliente}-` : "") + (f.cliente || "—");
                  return (
                    <TableRow key={`${f.resguardo}-${f.numero}-${f.tipo}-${i}`}>
                      <TableCell className="text-center">
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{f.serie}</span>
                      </TableCell>
                      <TableCell>
                        {f.url ? (
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                            {numPart}
                          </a>
                        ) : (
                          <span className="font-semibold">{numPart}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{fechaCorta(f.fecha)}</TableCell>
                      <TableCell className="max-w-48 truncate text-sm" title={f.cliente}>
                        {clienteTxt}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.dniCif || "—"}</TableCell>
                      <TableCell className={cn("text-right text-sm tabular-nums whitespace-nowrap", f.baseImponible < 0 && "text-destructive")}>{euros(f.baseImponible)}</TableCell>
                      <TableCell className={cn("text-right text-sm tabular-nums whitespace-nowrap", f.iva < 0 && "text-destructive")}>{euros(f.iva)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">0,00 €</TableCell>
                      <TableCell className={cn("text-right text-sm font-semibold tabular-nums whitespace-nowrap", f.totalConIva < 0 && "text-destructive")}>{euros(f.totalConIva)}</TableCell>
                      <TableCell>
                        {f.url ? (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            nativeButton={false}
                            title="Abrir PDF"
                            render={<a href={f.url} target="_blank" rel="noopener noreferrer" />}
                          >
                            <ExportSquare className="size-3.5" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
            {!cargando && visibles.length > 0 && (
              <tfoot>
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={4} className="text-right text-xs text-muted-foreground">
                    {visibles.length} factura{visibles.length !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">Totales:</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{euros(totales.base)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{euros(totales.iva)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">0,00 €</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{euros(totales.total)}</TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>

        {!cargando && visibles.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              Filas {inicio + 1}–{fin} de {visibles.length}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span>Filas por página:</span>
                <Select
                  value={String(filasPorPagina)}
                  onValueChange={(v) => {
                    if (!v) return;
                    setFilasPorPagina(Number(v));
                    setPagina(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue>{(v: string) => (v === "0" ? "Todas" : v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RF_FILAS_OPCIONES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v === "0" ? "Todas" : v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filasPorPagina > 0 && totalPaginas > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon-sm" disabled={paginaSegura <= 1} onClick={() => setPagina(1)}>
                    <ArrowLeft3 className="size-3.5" />
                  </Button>
                  <Button variant="outline" size="icon-sm" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                    <ArrowLeft2 className="size-3.5" />
                  </Button>
                  <span className="px-2">
                    Pág. {paginaSegura} / {totalPaginas}
                  </span>
                  <Button variant="outline" size="icon-sm" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
                    <ArrowRight2 className="size-3.5" />
                  </Button>
                  <Button variant="outline" size="icon-sm" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina(totalPaginas)}>
                    <ArrowRight3 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Totales por tipo */}
      {!cargando && visibles.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Desglose por tipo</p>
          <div className="flex flex-wrap gap-2">
            {totalesPorTipo.map(([tipo, tot]) => {
              const estilo = RF_TIPO_ESTILO[tipo] ?? { label: tipo, bg: "#6c757d", color: "#fff" };
              return (
                <div key={tipo} className="min-w-40 rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: estilo.bg, color: estilo.color }}>
                      {estilo.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tot.count} factura{tot.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-[.95rem] font-bold">{euros(tot.total)}</div>
                  <div className="text-xs text-muted-foreground">
                    Base: {euros(tot.base)} · IVA: {euros(tot.iva)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <HistorialExportacionesDialog open={historialAbierto} onOpenChange={setHistorialAbierto} />
    </div>
  );
}
