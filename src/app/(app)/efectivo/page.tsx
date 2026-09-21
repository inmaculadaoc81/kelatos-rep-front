"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, MoneySend, MoneyRecive, ArrowRotateLeft, Coin1, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MovimientoEfectivo, TipoMovimientoEfectivo, conSaldoAcumulado, resumir } from "@/lib/efectivo";
import { RetirarEfectivoDialog } from "./retirar-efectivo-dialog";

const TIMEZONE = "Europe/Madrid";

const ESTILO_TIPO: Record<TipoMovimientoEfectivo, { etiqueta: string; clase: string }> = {
  cobro: { etiqueta: "Cobro", clase: "bg-green-500/10 text-green-600" },
  devolucion: { etiqueta: "Devolución", clase: "bg-red-500/10 text-red-600" },
  retirada: { etiqueta: "Retirada", clase: "bg-amber-500/10 text-amber-600" },
};

function euros(n: number): string {
  // `|| 0` normaliza -0 (p. ej. -resumen.devoluciones sin devoluciones) para no pintar "-0,00 €".
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

/** Importe con signo explícito: "+12,00 €" / "−12,00 €". */
function eurosConSigno(n: number): string {
  if (n === 0) return euros(0);
  return `${n > 0 ? "+" : "−"}${euros(Math.abs(n))}`;
}

function diaMadrid(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

/** Fecha, y hora solo si el documento la trae (los que solo guardan el día
    llegan a medianoche de Madrid y no tiene sentido enseñar "00:00"). */
function formatearFecha(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const fecha = d.toLocaleDateString("es-ES", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });
  return hora === "00:00" ? fecha : `${fecha} ${hora}`;
}

export default function EfectivoPage() {
  const [movimientos, setMovimientos] = useState<MovimientoEfectivo[]>([]);
  const [puedeRetirar, setPuedeRetirar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [retirarAbierto, setRetirarAbierto] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/efectivo");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setMovimientos(data.movimientos as MovimientoEfectivo[]);
      setPuedeRetirar(!!data.puedeRetirar);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // El saldo se calcula sobre TODO el historial (una fila filtrada sigue
  // mostrando cuánto había en caja justo después de ese movimiento).
  const todos = useMemo(() => conSaldoAcumulado(movimientos), [movimientos]);
  const saldoActual = todos.length ? todos[0].saldo : 0;
  const origenes = useMemo(() => Array.from(new Set(movimientos.map((m) => m.origen).filter(Boolean))).sort(), [movimientos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return todos.filter((m) => {
      if (filtroTipo && m.tipo !== filtroTipo) return false;
      if (filtroOrigen && m.origen !== filtroOrigen) return false;
      if (desde || hasta) {
        const dia = diaMadrid(m.fecha);
        if (!dia) return false;
        if (desde && dia < desde) return false;
        if (hasta && dia > hasta) return false;
      }
      if (q) {
        const texto = `${m.referencia} ${m.numero} ${m.cliente} ${m.concepto} ${m.origen} ${m.usuario || ""}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [todos, busqueda, filtroTipo, filtroOrigen, desde, hasta]);

  const resumen = useMemo(() => resumir(filtrados), [filtrados]);
  const hayFiltros = !!(busqueda || filtroTipo || filtroOrigen || desde || hasta);

  async function anular(m: MovimientoEfectivo) {
    const motivo = window.prompt(`Anular la retirada de ${euros(Math.abs(m.importe))}.\nIndica el motivo (obligatorio):`);
    if (motivo === null) return;
    if (!motivo.trim()) return toast.error("El motivo de la anulación es obligatorio");
    try {
      const res = await fetch(`/api/efectivo/retiradas/${m.retiradaId}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Retirada anulada");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroTipo("");
    setFiltroOrigen("");
    setDesde("");
    setHasta("");
  }

  const columnas = puedeRetirar ? 10 : 9;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Efectivo</h1>
          <p className="text-sm text-muted-foreground">Cobros y devoluciones en efectivo de tickets y facturas, y retiradas de caja</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          {puedeRetirar && (
            <Button size="sm" className="gap-1.5" onClick={() => setRetirarAbierto(true)}>
              <MoneySend className="size-4" /> Retirar efectivo
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">En caja ahora</p>
              <p className="text-2xl font-bold tabular-nums">{cargando ? "…" : euros(saldoActual)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Todo el historial</p>
            </div>
            <Coin1 className="size-8 text-primary/40" />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Cobrado</p>
              <p className="text-2xl font-bold tabular-nums text-green-600">{cargando ? "…" : euros(resumen.cobros)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hayFiltros ? "Según filtros" : "Todo el historial"}</p>
            </div>
            <MoneyRecive className="size-8 text-green-600/40" />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Devuelto</p>
              <p className="text-2xl font-bold tabular-nums text-red-600">{cargando ? "…" : euros(-resumen.devoluciones)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Rectificativas en efectivo</p>
            </div>
            <ArrowRotateLeft className="size-8 text-red-600/40" />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Retirado</p>
              <p className="text-2xl font-bold tabular-nums text-amber-600">{cargando ? "…" : euros(-resumen.retiradas)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Retiradas de caja</p>
            </div>
            <MoneySend className="size-8 text-amber-600/40" />
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Resguardo, nº documento, cliente…" className="w-72 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={filtroTipo || "__todos__"} onValueChange={(v) => setFiltroTipo(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-56">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? ESTILO_TIPO[v as TipoMovimientoEfectivo]?.etiqueta || v : "Todos los movimientos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los movimientos</SelectItem>
            <SelectItem value="cobro">Cobros</SelectItem>
            <SelectItem value="devolucion">Devoluciones</SelectItem>
            <SelectItem value="retirada">Retiradas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroOrigen || "__todos__"} onValueChange={(v) => setFiltroOrigen(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? v : "Todos los orígenes")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los orígenes</SelectItem>
            {origenes.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Desde</span>
          <Input type="date" className="w-40" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          <span>hasta</span>
          <Input type="date" className="w-40" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
        </div>
        {hayFiltros && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Resguardo / Ref.</TableHead>
              <TableHead>Nº documento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              {puedeRetirar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnas }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnas} className="py-8 text-center text-muted-foreground">
                  {hayFiltros ? "Ningún movimiento coincide con los filtros" : "Todavía no hay movimientos en efectivo"}
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtrados.map((m) => {
                const estilo = ESTILO_TIPO[m.tipo];
                return (
                  <TableRow key={m.id} className={m.anulada ? "opacity-50" : undefined}>
                    <TableCell className="whitespace-nowrap text-sm">{formatearFecha(m.fecha)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${estilo.clase}`}>{estilo.etiqueta}</span>
                      {m.anulada && (
                        <span className="ml-1 inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground" title={m.anuladaMotivo}>
                          Anulada
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{m.origen || "-"}</TableCell>
                    <TableCell className="max-w-56 text-sm">
                      <span className="line-clamp-2">{m.concepto}</span>
                      {m.tipo === "retirada" && m.usuario && <span className="block text-xs text-muted-foreground">{m.usuario}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{m.referencia || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{m.numero || "-"}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm">{m.cliente || "-"}</TableCell>
                    <TableCell
                      className={`whitespace-nowrap text-right text-sm font-medium tabular-nums ${m.importe < 0 ? "text-red-600" : "text-green-600"} ${m.anulada ? "line-through" : ""}`}
                    >
                      {m.sinImporte ? (
                        <span className="font-normal text-muted-foreground" title="Devolución anterior a que se guardara el importe: consta, pero no se puede restar">
                          Sin importe
                        </span>
                      ) : (
                        eurosConSigno(m.importe)
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{euros(m.saldo)}</TableCell>
                    {puedeRetirar && (
                      <TableCell>
                        {m.tipo === "retirada" && !m.anulada && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => anular(m)} title="Anular esta retirada">
                            <CloseCircle className="size-3.5" /> Anular
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {puedeRetirar && <RetirarEfectivoDialog open={retirarAbierto} onOpenChange={setRetirarAbierto} saldo={saldoActual} onRegistrada={cargar} />}
    </div>
  );
}
