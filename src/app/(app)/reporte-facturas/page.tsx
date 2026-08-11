"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, DocumentText } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatearFecha } from "@/lib/dias-entrega";
import { FacturaCliente } from "@/lib/facturas-cliente";

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// El número de factura codifica la serie fiscal como prefijo (1-000123,
// 3-000045) — mismo criterio que _fcSerie() en el sistema original.
function serieDe(numero: string): string {
  return numero.match(/^(\d+)-/)?.[1] || "";
}

// Los totales se guardan con IVA incluido en todo el sistema (ver
// stock-piezas.ts, presupuesto-form). Base = total/1.21.
function desglosarIva(total: number) {
  const base = total / 1.21;
  return { base, iva: total - base };
}

export default function ReporteFacturasPage() {
  const [facturas, setFacturas] = useState<FacturaCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [serie, setSerie] = useState("");

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/facturas-clientes");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFacturas(data.facturas as FacturaCliente[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const series = useMemo(() => {
    const set = new Set(facturas.map((f) => serieDe(f.numero)).filter(Boolean));
    return Array.from(set).sort();
  }, [facturas]);

  const filtradas = useMemo(() => {
    let lista = facturas;
    if (serie) lista = lista.filter((f) => serieDe(f.numero) === serie);
    if (fechaDesde) lista = lista.filter((f) => f.fecha && f.fecha.slice(0, 10) >= fechaDesde);
    if (fechaHasta) lista = lista.filter((f) => f.fecha && f.fecha.slice(0, 10) <= fechaHasta);
    return [...lista].sort((a, b) => a.numero.localeCompare(b.numero));
  }, [facturas, fechaDesde, fechaHasta, serie]);

  const totales = useMemo(() => {
    return filtradas.reduce(
      (acc, f) => {
        const { base, iva } = desglosarIva(f.total);
        acc.base += base;
        acc.iva += iva;
        acc.total += f.total;
        return acc;
      },
      { base: 0, iva: 0, total: 0 }
    );
  }, [filtradas]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Reporte de Facturas</h1>
          <p className="text-sm text-muted-foreground">Desglose fiscal — base, IVA y total por factura</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
          <Input type="date" className="w-36" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
          <Input type="date" className="w-36" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <Select value={serie || "__todas__"} onValueChange={(v) => setSerie(!v || v === "__todas__" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string) => (v === "__todas__" ? "Todas las series" : `Serie ${v}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas__">Todas las series</SelectItem>
            {series.map((s) => (
              <SelectItem key={s} value={s}>
                Serie {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(fechaDesde || fechaHasta || serie) && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setFechaDesde(""); setFechaHasta(""); setSerie(""); }}>
            Limpiar
          </Button>
        )}
        {!cargando && <span className="ml-auto text-sm text-muted-foreground">{filtradas.length} facturas</span>}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">S.</TableHead>
              <TableHead>Núm.</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>N.I.F.</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtradas.map((f) => {
                const { base, iva } = desglosarIva(f.total);
                return (
                  <TableRow key={`${f.resguardo}-${f.tipo}`}>
                    <TableCell className="text-sm text-muted-foreground">{serieDe(f.numero) || "-"}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold">{f.numero}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatearFecha(f.fecha)}</TableCell>
                    <TableCell className="text-sm">{f.cliente || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.dniCif || "-"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{euros(base)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{euros(iva)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{euros(f.total)}</TableCell>
                    <TableCell>
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <DocumentText className="size-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
          {!cargando && filtradas.length > 0 && (
            <tfoot>
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell colSpan={5} className="text-right text-sm">
                  Totales
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{euros(totales.base)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{euros(totales.iva)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{euros(totales.total)}</TableCell>
                <TableCell />
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}
