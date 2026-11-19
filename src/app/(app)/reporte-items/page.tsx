"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft2, ArrowLeft3, ArrowRight2, ArrowRight3, DocumentDownload, InfoCircle, Refresh2, SearchNormal1 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { descargarCsv } from "@/lib/reporte-facturas";
import { fechaMadrid } from "@/lib/reportes";
import { ColumnaFiltro } from "../facturas-clientes/columna-filtro";

interface LineaItem {
  numero: string;
  tipo: string;
  fecha: string;
  cliente: string;
  nif: string;
  forma_pago: string;
  banco: string;
  estado: string;
  origen: string;
  linea: number;
  referencia: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  descuento: number;
  base: number;
  iva: number;
  total: number;
  /** Documento que no guarda sus líneas (alquiler, mensajería, anticipo, revisión…): entra como una sola línea por su importe. */
  sinDesglose?: boolean;
}

interface GrupoItem {
  clave: string;
  referencia: string;
  descripcion: string;
  unidades: number;
  base: number;
  total: number;
  documentos: Set<string>;
}

type Columna = "fecha" | "numero" | "tipo" | "cliente" | "item" | "ref" | "pago" | "estado";

const euros = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const num = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const iso = (d: Date) => d.toISOString().slice(0, 10);
function fechaCorta(v: string): string {
  const dia = fechaMadrid(v);
  if (!dia) return "—";
  const p = dia.split("-");
  return `${p[2]}/${p[1]}/${p[0].slice(-2)}`;
}
const csvCelda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
/** La mano de obra no es un ítem vendido: se deja fuera salvo que se pida (descripciones «Mano de obra…», «MANO DE OBRA (v1)», etc.). */
const esManoDeObra = (descripcion: string) => /^\s*mano\s+de\s+obra/i.test(descripcion);

function valorColumna(l: LineaItem, col: Columna): string {
  switch (col) {
    case "fecha": return fechaCorta(l.fecha);
    case "numero": return l.numero;
    case "tipo": return l.tipo;
    case "cliente": return l.cliente || "—";
    case "item": return l.referencia ? `${l.referencia} · ${l.descripcion}` : l.descripcion || "—";
    case "ref": return l.referencia || "—";
    case "pago": return [l.forma_pago, l.banco].filter(Boolean).join(" · ") || "—";
    case "estado": return l.estado || "—";
  }
}

const CAB = "text-[.78rem] tracking-wide uppercase";
const ETIQ = "mb-1 text-[.7rem] font-bold tracking-wider text-muted-foreground uppercase";

/** Reporte de ítems facturados (petición del usuario, 2026-11-19): qué ítems lleva cada factura/ticket y cuánto se ha vendido de cada uno, con el resto de datos del documento. */
export default function ReporteItemsPage() {
  const hoy = new Date();
  const [desde, setDesde] = useState(`${hoy.getFullYear()}-01-01`);
  const [hasta, setHasta] = useState(iso(hoy));
  const [lineas, setLineas] = useState<LineaItem[]>([]);
  const [truncado, setTruncado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vista, setVista] = useState<"items" | "detalle">("items");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [soloStock, setSoloStock] = useState(false);
  const [conManoDeObra, setConManoDeObra] = useState(false);
  const [filtrosCol, setFiltrosCol] = useState<Partial<Record<Columna, Set<string>>>>({});
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(`/api/reporte-items?desde=${desde}&hasta=${hasta}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error");
      setLineas(j.lineas || []);
      setTruncado(!!j.truncado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  // Al cambiar cualquier filtro, vuelve a la primera página (se reajusta durante el render, sin efecto).
  const claveFiltros = JSON.stringify([q, tipo, soloStock, conManoDeObra, vista, filasPorPagina, desde, hasta, Object.entries(filtrosCol).map(([k, v]) => [k, Array.from(v ?? [])])]);
  const [claveAnterior, setClaveAnterior] = useState(claveFiltros);
  if (claveAnterior !== claveFiltros) {
    setClaveAnterior(claveFiltros);
    setPagina(1);
  }

  const tipos = useMemo(() => Array.from(new Set(lineas.map((l) => l.tipo))).sort(), [lineas]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return lineas.filter((l) => {
      if (tipo && l.tipo !== tipo) return false;
      if (soloStock && !l.referencia) return false;
      if (!conManoDeObra && esManoDeObra(l.descripcion)) return false;
      for (const [col, sel] of Object.entries(filtrosCol) as [Columna, Set<string>][]) {
        if (sel && !sel.has(valorColumna(l, col))) return false;
      }
      if (!t) return true;
      return [l.referencia, l.descripcion, l.cliente, l.numero, l.origen, l.nif].some((x) => (x || "").toLowerCase().includes(t));
    });
  }, [lineas, q, tipo, soloStock, conManoDeObra, filtrosCol]);

  const grupos = useMemo(() => {
    const m = new Map<string, GrupoItem>();
    for (const l of filtradas) {
      const clave = l.referencia ? `ref:${l.referencia}` : `desc:${l.descripcion.trim().toLowerCase()}`;
      let g = m.get(clave);
      if (!g) {
        g = { clave, referencia: l.referencia, descripcion: l.descripcion, unidades: 0, base: 0, total: 0, documentos: new Set() };
        m.set(clave, g);
      }
      g.unidades += l.cantidad;
      g.base += l.base;
      g.total += l.total;
      g.documentos.add(l.numero);
    }
    return Array.from(m.values()).sort((a, b) => b.base - a.base);
  }, [filtradas]);

  const totales = useMemo(
    () => ({ unidades: filtradas.reduce((a, l) => a + l.cantidad, 0), base: filtradas.reduce((a, l) => a + l.base, 0), iva: filtradas.reduce((a, l) => a + l.iva, 0), total: filtradas.reduce((a, l) => a + l.total, 0) }),
    [filtradas]
  );

  function opcionesColumna(col: Columna): string[] {
    return Array.from(new Set(lineas.map((l) => valorColumna(l, col)))).sort((a, b) => a.localeCompare(b, "es"));
  }
  function aplicarFiltroColumna(col: Columna, sel: Set<string> | null) {
    setFiltrosCol((prev) => {
      const sig = { ...prev };
      if (sel) sig[col] = sel;
      else delete sig[col];
      return sig;
    });
  }
  function cabeceraFiltro(col: Columna, label: string) {
    return (
      <TableHead className={CAB}>
        <span className="inline-flex items-center">
          {label}
          <ColumnaFiltro opciones={opcionesColumna(col)} seleccion={filtrosCol[col] ?? null} onAplicar={(s) => aplicarFiltroColumna(col, s)} />
        </span>
      </TableHead>
    );
  }

  const hayFiltros = !!(q || tipo || soloStock || Object.keys(filtrosCol).length > 0);
  function quitarFiltros() {
    setQ("");
    setTipo("");
    setSoloStock(false);
    setFiltrosCol({});
  }

  function preset(d: number | "mes" | "anio") {
    const h = new Date();
    let desdeN: Date;
    if (d === "mes") desdeN = new Date(h.getFullYear(), h.getMonth(), 1);
    else if (d === "anio") desdeN = new Date(h.getFullYear(), 0, 1);
    else desdeN = new Date(h.getTime() - d * 86400000);
    setDesde(iso(desdeN));
    setHasta(iso(h));
  }

  function verDetalleDe(g: GrupoItem) {
    setQ(g.referencia || g.descripcion);
    setVista("detalle");
  }

  const totalFilas = vista === "items" ? grupos.length : filtradas.length;
  const totalPaginas = filasPorPagina > 0 ? Math.max(1, Math.ceil(totalFilas / filasPorPagina)) : 1;
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = filasPorPagina > 0 ? (paginaSegura - 1) * filasPorPagina : 0;
  const fin = filasPorPagina > 0 ? Math.min(inicio + filasPorPagina, totalFilas) : totalFilas;
  const gruposPagina = grupos.slice(inicio, fin);
  const lineasPagina = filtradas.slice(inicio, fin);

  function exportar() {
    const sep = ";";
    let csv: string;
    if (vista === "items") {
      csv = ["Referencia", "Ítem", "Unidades", "Documentos", "Base (€)", "Total con IVA (€)", "Precio medio base (€)"].join(sep) + "\n" +
        grupos.map((g) => [g.referencia, g.descripcion, g.unidades, g.documentos.size, g.base.toFixed(2).replace(".", ","), g.total.toFixed(2).replace(".", ","), (g.unidades ? g.base / g.unidades : 0).toFixed(2).replace(".", ",")].map(csvCelda).join(sep)).join("\n");
    } else {
      csv = ["Fecha", "Documento", "Tipo", "Origen", "Cliente", "NIF", "Referencia", "Ítem", "Cantidad", "Precio", "Dto %", "Base (€)", "IVA (€)", "Total (€)", "Forma de pago", "Banco", "Estado", "Sin desglose"].join(sep) + "\n" +
        filtradas.map((l) => [fechaCorta(l.fecha), l.numero, l.tipo, l.origen, l.cliente, l.nif, l.referencia, l.descripcion, l.cantidad, l.precio, l.descuento, l.base.toFixed(2).replace(".", ","), l.iva.toFixed(2).replace(".", ","), l.total.toFixed(2).replace(".", ","), l.forma_pago, l.banco, l.estado, l.sinDesglose ? "sí" : ""].map(csvCelda).join(sep)).join("\n");
    }
    descargarCsv("﻿" + csv, `items-facturados-${vista}-${desde}-a-${hasta}.csv`);
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Reporte de ítems facturados</h1>
            {/* Círculo de ayuda: al pasar el cursor (o enfocarlo) sale un cuadro con la explicación. */}
            <div className="group relative inline-flex">
              <button
                type="button"
                aria-label="¿Qué incluye este reporte?"
                className="flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <InfoCircle className="size-4" />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none invisible absolute top-full left-0 z-30 mt-2 w-[min(30rem,88vw)] rounded-lg border bg-popover p-4 text-xs text-popover-foreground opacity-0 shadow-xl transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
              >
                <p className="mb-2 text-sm font-semibold">¿Qué incluye este reporte?</p>
                <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
                  <li>Las líneas de facturas y tickets de reparaciones, ventas, facturas manuales y tickets manuales, con su fecha (hora de Madrid).</li>
                  <li>Los importes son sin IVA por línea (cantidad × precio − descuento); el IVA es el 21 %.</li>
                  <li>Las rectificativas (Serie 3) restan: entran con las líneas del documento original en negativo, así el neto por ítem es el real.</li>
                  <li>La mano de obra no cuenta como ítem: por defecto queda fuera de la lista y de los totales; se puede incluir con la casilla «Incluir mano de obra».</li>
                  <li>Los ítems con referencia de pieza se agrupan por referencia; el resto (servicios…) por descripción.</li>
                  <li>Los documentos que no guardan sus líneas (alquileres, recogidas, mensajería, anticipos, revisión pagada y rectificativas o corregidas sin líneas) también están: entran como una sola línea con su importe total y la marca «sin desglose».</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Qué ítems lleva cada factura o ticket y cuánto se ha vendido de cada uno, con el resto de datos del documento</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportar} disabled={filtradas.length === 0}>
            <DocumentDownload className="size-4" /> Exportar CSV
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}
      {truncado && <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">Hay más líneas de las que se muestran: acorta el rango de fechas.</div>}

      {/* ── Barra de filtros ── */}
      <div className="mb-4 space-y-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative">
            <SearchNormal1 className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Ítem, referencia, cliente, factura…" className="w-64 pl-7" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <p className={ETIQ}>Desde</p>
            <Input type="date" className="h-8 w-36 text-xs" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <p className={ETIQ}>Hasta</p>
            <Input type="date" className="h-8 w-36 text-xs" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => preset("mes")}>Este mes</Button>
            <Button variant="ghost" size="sm" onClick={() => preset(30)}>30 días</Button>
            <Button variant="ghost" size="sm" onClick={() => preset("anio")}>Este año</Button>
          </div>
          <div>
            <p className={ETIQ}>Tipo</p>
            <Select value={tipo || "__todos__"} onValueChange={(v) => setTipo(!v || v === "__todos__" ? "" : v)}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue>{(v: string) => (v === "__todos__" ? "Todos" : v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex h-8 cursor-pointer items-center gap-1.5 text-sm">
            <Checkbox checked={soloStock} onCheckedChange={(v) => setSoloStock(!!v)} /> Solo piezas de stock
          </label>
          <label className="flex h-8 cursor-pointer items-center gap-1.5 text-sm">
            <Checkbox checked={conManoDeObra} onCheckedChange={(v) => setConManoDeObra(!!v)} /> Incluir mano de obra
          </label>
          {hayFiltros && (
            <Button variant="outline" size="sm" className="h-8" onClick={quitarFiltros}>Quitar filtros</Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="inline-flex rounded-md border p-0.5">
            <button type="button" onClick={() => setVista("items")} className={`rounded px-3 py-1 ${vista === "items" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Por ítem</button>
            <button type="button" onClick={() => setVista("detalle")} className={`rounded px-3 py-1 ${vista === "detalle" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Detalle por factura</button>
          </div>
          <span className="text-xs text-muted-foreground">
            {filtradas.length} líneas · {num(totales.unidades)} uds · base {euros(totales.base)} · IVA {euros(totales.iva)} · total {euros(totales.total)}
          </span>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          {vista === "items" ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-sky-50 dark:bg-sky-950/40">
                  {cabeceraFiltro("ref", "Ref.")}
                  {cabeceraFiltro("item", "Ítem")}
                  <TableHead className={cn(CAB, "text-right")}>Unidades</TableHead>
                  <TableHead className={cn(CAB, "text-right")}>Facturas/tickets</TableHead>
                  <TableHead className={cn(CAB, "text-right")}>Precio medio</TableHead>
                  <TableHead className={cn(CAB, "text-right")}>Base (sin IVA)</TableHead>
                  <TableHead className={cn(CAB, "text-right")}>Total con IVA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && lineas.length === 0
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                    ))
                  : gruposPagina.map((g) => (
                      <TableRow key={g.clave} className="cursor-pointer hover:bg-muted/50" onClick={() => verDetalleDe(g)} title="Ver las facturas de este ítem">
                        <TableCell className="text-sm font-medium">{g.referencia || "—"}</TableCell>
                        <TableCell className="max-w-md text-sm">{g.descripcion}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{num(g.unidades)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{g.documentos.size}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{euros(g.unidades ? g.base / g.unidades : 0)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">{euros(g.base)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{euros(g.total)}</TableCell>
                      </TableRow>
                    ))}
                {!cargando && grupos.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sin resultados en este periodo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-sky-50 dark:bg-sky-950/40">
                  {cabeceraFiltro("fecha", "Fecha")}
                  {cabeceraFiltro("numero", "Documento")}
                  {cabeceraFiltro("tipo", "Tipo")}
                  {cabeceraFiltro("cliente", "Cliente")}
                  {cabeceraFiltro("item", "Ítem")}
                  <TableHead className={cn(CAB, "text-right")}>Cant.</TableHead>
                  <TableHead className={cn(CAB, "text-right")}>Precio</TableHead>
                  <TableHead className={cn(CAB, "text-right")}>Base</TableHead>
                  <TableHead className={cn(CAB, "text-right")}>Total</TableHead>
                  {cabeceraFiltro("pago", "Pago")}
                  {cabeceraFiltro("estado", "Estado")}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && lineas.length === 0
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                    ))
                  : lineasPagina.map((l, i) => (
                      <TableRow key={`${l.numero}-${l.linea}-${inicio + i}`}>
                        <TableCell className="text-sm whitespace-nowrap">{fechaCorta(l.fecha)}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{l.numero}</div>
                          <div className="text-xs text-muted-foreground">{l.origen}</div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{l.tipo}</TableCell>
                        <TableCell className="max-w-48 text-sm">
                          <div className="truncate">{l.cliente || "—"}</div>
                          {l.nif && <div className="text-xs text-muted-foreground">{l.nif}</div>}
                        </TableCell>
                        <TableCell className="max-w-96 text-sm">
                          {l.referencia && <span className="mr-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{l.referencia}</span>}
                          {l.descripcion}
                          {l.sinDesglose && <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300" title="Este documento no guarda sus líneas: se muestra una sola línea con su importe total">sin desglose</span>}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{num(l.cantidad)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{euros(l.precio)}{l.descuento ? <div className="text-xs text-muted-foreground">-{l.descuento}%</div> : null}</TableCell>
                        <TableCell className={cn("text-right text-sm font-semibold tabular-nums", l.base < 0 && "text-destructive")}>{euros(l.base)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{euros(l.total)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{[l.forma_pago, l.banco].filter(Boolean).join(" · ") || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.estado || "—"}</TableCell>
                      </TableRow>
                    ))}
                {!cargando && filtradas.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="py-8 text-center text-muted-foreground">Sin resultados en este periodo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {vista === "items" ? `${grupos.length} ítem${grupos.length !== 1 ? "s" : ""}` : `${filtradas.length} línea${filtradas.length !== 1 ? "s" : ""}`} ·{" "}
            <span className="text-foreground">{euros(totales.base)}</span> <span className="font-normal">sin IVA</span>
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filas por página:</span>
              <Select value={String(filasPorPagina)} onValueChange={(v) => { if (v) setFilasPorPagina(parseInt(v, 10)); }}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue>{(v: string) => (v === "0" ? "Todas" : v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {["15", "25", "50", "100", "0"].map((v) => (
                    <SelectItem key={v} value={v}>{v === "0" ? "Todas" : v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura <= 1} onClick={() => setPagina(1)}>
                <ArrowLeft3 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                <ArrowLeft2 className="size-3.5" />
              </Button>
              <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">
                {totalFilas === 0
                  ? ""
                  : filasPorPagina === 0 || totalPaginas <= 1
                    ? `Mostrando ${totalFilas}`
                    : `Página ${paginaSegura} de ${totalPaginas} (${inicio + 1}–${fin})`}
              </span>
              <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
                <ArrowRight2 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={filasPorPagina === 0 || paginaSegura >= totalPaginas} onClick={() => setPagina(totalPaginas)}>
                <ArrowRight3 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
