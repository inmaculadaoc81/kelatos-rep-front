"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft2, Bank, Calendar, Category2, Clock, CloseCircle, Money, Refresh2, SearchNormal1, TickCircle, Wallet } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CobroReparacion } from "@/app/api/reparaciones/cobros/route";

const ETIQUETA_FORMA_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta bancaria",
  tarjeta_virtual: "Tarjeta virtual",
  transferencia: "Transferencia bancaria",
  bizum: "Bizum",
  multiforma: "Multiforma",
  redsys: "Redsys",
};

function StatCard({ icon: Icono, value, label, colorClase }: { icon: typeof Wallet; value: string | number; label: string; colorClase: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${colorClase}`}>
        <Icono className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function EstadoCobroPill({ estado }: { estado: "Pendiente" | "Cobrado" }) {
  const cobrado = estado === "Cobrado";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
        cobrado ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      }`}
    >
      {cobrado ? <TickCircle className="size-3" /> : <Clock className="size-3" />}
      {cobrado ? "Cobrado" : "Pendiente"}
    </span>
  );
}

function fmtImporte(total: string | null) {
  if (total === null || total === "") return "-";
  const n = Number(total);
  return Number.isFinite(n) ? `${n.toFixed(2)} €` : "-";
}

function fmtFecha(fecha: string | null) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CobrosReparacionesPage() {
  const [items, setItems] = useState<CobroReparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/reparaciones/cobros");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setItems(data.resultados as CobroReparacion[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // ── Filtros ──
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroForma, setFiltroForma] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const formasDisponibles = useMemo(
    () => [...new Set(items.map((i) => i.forma_pago).filter((f): f is string => !!f))].sort(),
    [items]
  );

  const itemsFiltrados = useMemo(() => {
    const filtro = busqueda.toLowerCase().trim();
    return items.filter((c) => {
      const textoOk =
        !filtro ||
        c.resguardo.toLowerCase().includes(filtro) ||
        (c.cliente_nombre || "").toLowerCase().includes(filtro) ||
        (c.equipo_modelo || "").toLowerCase().includes(filtro) ||
        (c.numero || "").toLowerCase().includes(filtro);

      let fechaOk = true;
      if (c.fecha && (fechaDesde || fechaHasta)) {
        const f = c.fecha.slice(0, 10);
        if (fechaDesde && f < fechaDesde) fechaOk = false;
        if (fechaHasta && f > fechaHasta) fechaOk = false;
      }

      const formaOk = !filtroForma || c.forma_pago === filtroForma;
      const estadoOk = !filtroEstado || c.estadoCobro === filtroEstado;

      return textoOk && fechaOk && formaOk && estadoOk;
    });
  }, [items, busqueda, fechaDesde, fechaHasta, filtroForma, filtroEstado]);

  const hayFiltrosActivos = !!(busqueda || fechaDesde || fechaHasta || filtroForma || filtroEstado);
  function limpiarFiltros() {
    setBusqueda(""); setFechaDesde(""); setFechaHasta(""); setFiltroForma(""); setFiltroEstado("");
  }

  const resumen = useMemo(() => {
    const cobrados = items.filter((i) => i.estadoCobro === "Cobrado");
    const pendientes = items.filter((i) => i.estadoCobro === "Pendiente");
    const importePendiente = pendientes.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
    return { cobrados: cobrados.length, pendientes: pendientes.length, importePendiente };
  }, [items]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/reparaciones" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft2 className="size-4" /> Todas las Reparaciones
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={TickCircle} value={resumen.cobrados} label="Cobrados" colorClase="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={Clock} value={resumen.pendientes} label="Pendientes" colorClase="bg-amber-500/10 text-amber-600" />
        <StatCard icon={Money} value={`${resumen.importePendiente.toFixed(2)} €`} label="Importe pendiente" colorClase="bg-primary/10 text-primary" />
        <StatCard icon={Category2} value={items.length} label="Total documentos" colorClase="bg-muted text-muted-foreground" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Cobros</h1>
          <p className="text-sm text-muted-foreground">
            Facturas y tickets generados en Reparaciones — día, cliente/equipo, forma de pago y si ya está cobrado.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={cargar} disabled={cargando}>
          <Refresh2 className={`size-3.5 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar cobros: {error}
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-4 space-y-2 rounded-xl border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <SearchNormal1 className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar resguardo, cliente, equipo, nº documento..." className="pl-8" />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              <Label className="text-xs whitespace-nowrap text-muted-foreground">Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-auto" />
              <Label className="text-xs whitespace-nowrap text-muted-foreground">Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-auto" />
            </div>
            {hayFiltrosActivos && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={limpiarFiltros}>
                <CloseCircle className="size-3.5" /> Limpiar
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filtroForma || "todas"} onValueChange={(v) => v && setFiltroForma(v === "todas" ? "" : v)}>
              <SelectTrigger className="w-auto min-w-40"><SelectValue placeholder="Forma de pago" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Forma de pago: Todas</SelectItem>
                {formasDisponibles.map((f) => <SelectItem key={f} value={f}>{ETIQUETA_FORMA_PAGO[f] || f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroEstado || "todos"} onValueChange={(v) => v && setFiltroEstado(v === "todos" ? "" : v)}>
              <SelectTrigger className="w-auto min-w-32"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Estado: Todos</SelectItem>
                <SelectItem value="Cobrado">Cobrado</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{itemsFiltrados.length} de {items.length}</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        {cargando ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No hay cobros registrados todavía." : "Ningún registro coincide con los filtros."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Día</TableHead>
                <TableHead>Resguardo</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Forma de pago</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsFiltrados.map((c, i) => (
                <TableRow key={`${c.resguardo}-${c.tipo}-${i}`}>
                  <TableCell className="text-xs whitespace-nowrap">{fmtFecha(c.fecha)}</TableCell>
                  <TableCell className="font-semibold">
                    <Link href={`/reparaciones?resguardo=${encodeURIComponent(c.resguardo)}`} className="hover:underline">
                      {c.resguardo}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <div className="truncate" title={c.cliente_nombre || ""}>{c.cliente_nombre || "N/A"}</div>
                    <div className="truncate text-xs text-muted-foreground" title={c.equipo_modelo || ""}>{c.equipo_modelo || "-"}</div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {c.tipo} <span className="text-xs text-muted-foreground">{c.numero || ""}</span>
                  </TableCell>
                  <TableCell className="font-medium">{fmtImporte(c.total)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      {c.forma_pago === "transferencia" && <Bank className="size-3.5 text-muted-foreground" />}
                      {c.forma_pago ? ETIQUETA_FORMA_PAGO[c.forma_pago] || c.forma_pago : "-"}
                    </div>
                    {(c.banco || c.referencia) && (
                      <div className="truncate text-xs text-muted-foreground" title={c.referencia || c.banco || ""}>
                        {c.banco || c.referencia}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <EstadoCobroPill estado={c.estadoCobro} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
