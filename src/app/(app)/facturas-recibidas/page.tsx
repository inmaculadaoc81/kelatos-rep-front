"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Refresh2, SearchNormal1, Add, ReceiptItem, Category, ClipboardTick, Warning2, Wallet, ArrowLeft2, ArrowLeft3, ArrowRight2, ArrowRight3 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FacturaRecibida, AlmacenFactura, EstadoPagoFactura, ETIQUETA_ALMACEN, COLOR_ALMACEN,
  ETIQUETA_ESTADO_PAGO, COLOR_ESTADO_PAGO, euros,
} from "@/lib/facturas-recibidas";
import { FacturaRecibidaFormDialog } from "./factura-recibida-form-dialog";

const FILAS_POR_PAGINA_OPCIONES = ["15", "20", "30", "40", "50", "100"];

function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function FacturasRecibidasPage() {
  const [facturas, setFacturas] = useState<FacturaRecibida[]>([]);
  const [total, setTotal] = useState(0);
  const [pendientesRevision, setPendientesRevision] = useState(0);
  const [posiblesDuplicados, setPosiblesDuplicados] = useState(0);
  const [pendientesPago, setPendientesPago] = useState(0);
  const [almacen, setAlmacen] = useState<AlmacenFactura | "">("");
  const [estadoPago, setEstadoPago] = useState<EstadoPagoFactura | "">("");
  const [soloDuplicados, setSoloDuplicados] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<FacturaRecibida | null>(null);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const parametros = useCallback(
    (pag: number, porPagina: number) => {
      const p = new URLSearchParams({ limit: String(porPagina), offset: String((pag - 1) * porPagina) });
      if (almacen) p.set("almacen", almacen);
      if (estadoPago) p.set("estadoPago", estadoPago);
      if (soloDuplicados) p.set("soloDuplicados", "true");
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      return p.toString();
    },
    [almacen, estadoPago, soloDuplicados, busquedaAplicada]
  );

  useEffect(() => {
    setPagina(1);
  }, [almacen, estadoPago, soloDuplicados, busquedaAplicada, filasPorPagina]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/facturas-recibidas?${parametros(pagina, filasPorPagina)}`);
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFacturas(data.facturas as FacturaRecibida[]);
      setTotal(data.total as number);
      setPendientesRevision(data.pendientesRevision as number);
      setPosiblesDuplicados(data.posiblesDuplicados as number);
      setPendientesPago(data.pendientesPago as number);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [parametros, pagina, filasPorPagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hayFiltros = !!(almacen || estadoPago || soloDuplicados);
  const totalPaginas = Math.max(1, Math.ceil(total / filasPorPagina));
  const inicio = total === 0 ? 0 : (pagina - 1) * filasPorPagina;
  const fin = Math.min(inicio + filasPorPagina, total);

  return (
    <div className="p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-blue-600 text-white">
            <ReceiptItem className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Facturas Recibidas</h1>
            <p className="text-sm text-muted-foreground">Facturas de proveedores (AliExpress, eBay, Amazon...) para control contable y fiscal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => { setEditando(null); setFormAbierto(true); }}>
            <Add className="size-4" /> Nueva factura
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300">
            <Category className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs text-muted-foreground">Total</span>
            <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !facturas.length ? "…" : total.toLocaleString("es-ES")}</span>
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/40"
          onClick={() => setSoloDuplicados((v) => !v)}
          aria-pressed={soloDuplicados}
        >
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${soloDuplicados ? "bg-red-500/20" : "bg-red-500/10"} text-red-600 dark:text-red-400`}>
            <Warning2 className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs text-muted-foreground">Posibles duplicados</span>
            <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !facturas.length ? "…" : posiblesDuplicados.toLocaleString("es-ES")}</span>
          </span>
        </button>
        <div className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ClipboardTick className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs text-muted-foreground">Pendientes de revisión</span>
            <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !facturas.length ? "…" : pendientesRevision.toLocaleString("es-ES")}</span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Wallet className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs text-muted-foreground">Pendientes de pago</span>
            <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !facturas.length ? "…" : pendientesPago.toLocaleString("es-ES")}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por proveedor, nº de factura o recepción…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={almacen || "Todos"} onValueChange={(v) => setAlmacen(v === "servicio" || v === "stock" ? v : "")}>
          <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Almacén" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            <SelectItem value="servicio">Servicio</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estadoPago || "Todos"} onValueChange={(v) => setEstadoPago(v === "pendiente" || v === "parcial" || v === "pagada" ? v : "")}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Estado de pago" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Cualquier estado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="pagada">Pagada</SelectItem>
          </SelectContent>
        </Select>
        {hayFiltros && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setAlmacen(""); setEstadoPago(""); setSoloDuplicados(false); }}>
            Quitar filtros
          </Button>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Nº factura</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado de pago</TableHead>
              <TableHead>Revisión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && facturas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Ninguna factura coincide con los filtros</TableCell>
              </TableRow>
            )}
            {!cargando &&
              facturas.map((f) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-muted/40" onClick={() => { setEditando(f); setFormAbierto(true); }}>
                  <TableCell>
                    <span className="block truncate font-medium">{f.proveedorNombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">{f.numeroRecepcion}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.numeroFacturaProveedor}
                    {f.posibleDuplicado && <Warning2 className="ml-1 inline size-3.5 text-red-500" />}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fechaCorta(f.fechaExpedicion)}</TableCell>
                  <TableCell>
                    {f.almacen ? (
                      <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_ALMACEN[f.almacen]}`}>{ETIQUETA_ALMACEN[f.almacen]}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{euros(f.baseImponible)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{euros(f.importeTotal)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO_PAGO[f.estadoPago]}`}>{ETIQUETA_ESTADO_PAGO[f.estadoPago]}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${f.estadoRevision === "validada" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {f.estadoRevision === "validada" ? "Validada" : "Pendiente"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {total.toLocaleString("es-ES")} factura{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filas por página:</span>
              <Select value={String(filasPorPagina)} onValueChange={(v) => { if (v) setFilasPorPagina(parseInt(v, 10)); }}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FILAS_POR_PAGINA_OPCIONES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => setPagina(1)}>
                <ArrowLeft3 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                <ArrowLeft2 className="size-3.5" />
              </Button>
              <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">
                {total === 0 ? "" : `Página ${pagina} de ${totalPaginas} (${inicio + 1}–${fin})`}
              </span>
              <Button variant="outline" size="icon-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
                <ArrowRight2 className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(totalPaginas)}>
                <ArrowRight3 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <FacturaRecibidaFormDialog facturaExistente={editando} open={formAbierto} onOpenChange={setFormAbierto} onGuardado={cargar} />
    </div>
  );
}
