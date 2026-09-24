"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Airplane, Add, Refresh2, SearchNormal1, Warning2, TickCircle, MoneyRecive, ArrowLeft2, ArrowRight2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { euros } from "@/lib/facturas-recibidas";
import { Importacion } from "@/lib/importaciones";
import { ImportacionFormDialog } from "./importacion-form-dialog";

const POR_PAGINA = 15;

function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export default function ImportacionesPage() {
  const [filas, setFilas] = useState<Importacion[]>([]);
  const [total, setTotal] = useState(0);
  const [pendientesRevision, setPendientesRevision] = useState(0);
  const [pendientesPago, setPendientesPago] = useState(0);
  const [sumaIva, setSumaIva] = useState(0);
  const [sumaDerechos, setSumaDerechos] = useState(0);
  const [estadoPago, setEstadoPago] = useState("");
  const [estadoRevision, setEstadoRevision] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [seleccionada, setSeleccionada] = useState<Importacion | null>(null);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [estadoPago, estadoRevision, busquedaAplicada]);

  const cargar = useCallback(async () => {
    const id = ++consulta.current;
    setCargando(true);
    setError(null);
    try {
      const p = new URLSearchParams({ limit: String(POR_PAGINA), offset: String((pagina - 1) * POR_PAGINA) });
      if (estadoPago) p.set("estadoPago", estadoPago);
      if (estadoRevision) p.set("estadoRevision", estadoRevision);
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      const res = await fetch(`/api/importaciones?${p.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (id !== consulta.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFilas(data.importaciones as Importacion[]);
      setTotal(data.total);
      setPendientesRevision(data.pendientesRevision);
      setPendientesPago(data.pendientesPago);
      setSumaIva(data.sumaIva);
      setSumaDerechos(data.sumaDerechos);
    } catch (e) {
      if (id === consulta.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [pagina, estadoPago, estadoRevision, busquedaAplicada]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const kpi = (titulo: string, valor: string, icono: React.ReactNode, color: string, activo?: boolean, onClick?: () => void) => (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-pressed={activo}
      className={`flex items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors ${onClick ? "hover:bg-muted/40" : "cursor-default"} ${activo ? "ring-2 ring-primary/50" : ""}`}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${color}`}>{icono}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted-foreground">{titulo}</span>
        <span className="block text-lg leading-tight font-semibold tabular-nums">{cargando && !filas.length ? "…" : valor}</span>
      </span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-green-600 text-white">
            <Airplane className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Importaciones / DUA</h1>
            <p className="text-sm text-muted-foreground">Declaraciones de aduana con IVA a la importación y aranceles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => { setSeleccionada(null); setFormAbierto(true); }}>
            <Add className="size-4" /> Nueva importación
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {kpi("IVA a la importación", euros(sumaIva), <MoneyRecive className="size-4" />, "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}
        {kpi("Derechos arancelarios", euros(sumaDerechos), <MoneyRecive className="size-4" />, "bg-sky-500/10 text-sky-600 dark:text-sky-400")}
        {kpi("Pendientes de revisión", String(pendientesRevision), <Warning2 className="size-4" />, "bg-amber-500/10 text-amber-600 dark:text-amber-400", estadoRevision === "pendiente", () => setEstadoRevision(estadoRevision === "pendiente" ? "" : "pendiente"))}
        {kpi("Pendientes de pago", String(pendientesPago), <TickCircle className="size-4" />, "bg-red-500/10 text-red-600 dark:text-red-400", estadoPago === "pendiente", () => setEstadoPago(estadoPago === "pendiente" ? "" : "pendiente"))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <SearchNormal1 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar DUA, exportador o factura comercial…" className="h-8 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={estadoPago || "todos"} onValueChange={(v) => setEstadoPago(!v || v === "todos" ? "" : v)}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue>{(v: string) => (v === "pendiente" ? "Pago pendiente" : v === "pagada" ? "Pagadas" : "Todos los pagos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los pagos</SelectItem>
            <SelectItem value="pendiente">Pago pendiente</SelectItem>
            <SelectItem value="pagada">Pagadas</SelectItem>
          </SelectContent>
        </Select>
        {(estadoPago || estadoRevision) && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setEstadoPago(""); setEstadoRevision(""); }}>
            Quitar filtros
          </Button>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registro</TableHead>
              <TableHead>DUA / MRN</TableHead>
              <TableHead>Aceptación</TableHead>
              <TableHead>Exportador</TableHead>
              <TableHead className="text-right">Valor aduana</TableHead>
              <TableHead className="text-right">Derechos</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total tributos</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Revisión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!cargando && filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  {total === 0 && !estadoPago && !estadoRevision && !busquedaAplicada
                    ? "Todavía no hay importaciones. Registra la primera con \"Nueva importación\"."
                    : "Ninguna importación coincide con los filtros"}
                </TableCell>
              </TableRow>
            )}
            {!cargando &&
              filas.map((i) => (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => { setSeleccionada(i); setFormAbierto(true); }}>
                  <TableCell className="whitespace-nowrap text-sm font-medium">{i.numeroRegistro}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{i.numeroDua}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fechaCorta(i.fechaAceptacion)}</TableCell>
                  <TableCell className="max-w-56 truncate text-sm" title={i.exportadorNombre}>{i.exportadorNombre}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{euros(i.valorAduanaEur)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{euros(i.derechosArancelarios)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{euros(i.cuotaIvaImportacion)}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{euros(i.totalTributos)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${i.estadoPago === "pagada" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                      {i.estadoPago === "pagada" ? "Pagada" : "Pendiente"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${i.estadoRevision === "validada" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                      {i.estadoRevision === "validada" ? "Validada" : "Pendiente"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {total.toLocaleString("es-ES")} importaci{total === 1 ? "ón" : "ones"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
              <ArrowLeft2 className="size-3.5" />
            </Button>
            <span className="px-1 text-xs whitespace-nowrap text-muted-foreground">Página {pagina} de {totalPaginas}</span>
            <Button variant="outline" size="icon-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>
              <ArrowRight2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <ImportacionFormDialog
        importacionExistente={seleccionada}
        open={formAbierto}
        onOpenChange={setFormAbierto}
        onGuardado={cargar}
      />
    </div>
  );
}
