"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, MoneyRecive, ArrowRotateLeft, Bank } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { toast } from "sonner";
import { MovimientoTarjeta, TarjetasImporteApi, TipoMovimientoTarjeta, resumir } from "@/lib/tarjetas";

const TIMEZONE = "Europe/Madrid";

const ESTILO_TIPO: Record<TipoMovimientoTarjeta, { etiqueta: string; clase: string }> = {
  cobro: { etiqueta: "Cobro", clase: "bg-green-500/10 text-green-600" },
  devolucion: { etiqueta: "Devolución", clase: "bg-red-500/10 text-red-600" },
};

function euros(n: number): string {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function eurosConSigno(n: number): string {
  if (n === 0) return euros(0);
  return `${n > 0 ? "+" : "−"}${euros(Math.abs(n))}`;
}

function diaMadrid(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hora = d.toLocaleTimeString("es-ES", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });
  return hora === "00:00" ? "—" : hora;
}

function hoyMadrid(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
}

function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function etiquetaDia(dia: string): string {
  if (!dia) return "Sin fecha";
  const txt = new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

const PERIODOS: { id: string; etiqueta: string; rango: (hoy: string) => [string, string] }[] = [
  { id: "hoy", etiqueta: "Hoy", rango: (h) => [h, h] },
  { id: "ayer", etiqueta: "Ayer", rango: (h) => [sumarDias(h, -1), sumarDias(h, -1)] },
  { id: "7d", etiqueta: "Últimos 7 días", rango: (h) => [sumarDias(h, -6), h] },
  { id: "mes", etiqueta: "Este mes", rango: (h) => [`${h.slice(0, 8)}01`, h] },
];

type FilaTabla =
  | { clase: "dia"; dia: string; n: number; neto: number }
  | { clase: "mov"; m: MovimientoTarjeta };

export default function TarjetasPage() {
  const [movimientos, setMovimientos] = useState<MovimientoTarjeta[]>([]);
  const [importesBanco, setImportesBanco] = useState<TarjetasImporteApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [filtroConcepto, setFiltroConcepto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  // Valores de la celda "Banco" en edición, por día — separados de
  // importesBanco (lo ya guardado) para poder mostrar el botón "Guardar"
  // solo cuando hay un cambio real, igual que TPV.
  const [bancoEditado, setBancoEditado] = useState<Record<string, { importe: number; notas: string }>>({});
  const [guardandoBanco, setGuardandoBanco] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/tarjetas");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setMovimientos(data.movimientos as MovimientoTarjeta[]);
      setImportesBanco(data.importesBanco as TarjetasImporteApi[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const bancoPorDia = useMemo(() => {
    const out: Record<string, TarjetasImporteApi> = {};
    for (const i of importesBanco) out[i.fecha] = i;
    return out;
  }, [importesBanco]);

  const origenes = useMemo(() => Array.from(new Set(movimientos.map((m) => m.origen).filter(Boolean))).sort(), [movimientos]);
  const conceptos = useMemo(() => Array.from(new Set(movimientos.map((m) => m.concepto).filter(Boolean))).sort(), [movimientos]);

  const baseSinTipo = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (filtroOrigen && m.origen !== filtroOrigen) return false;
      if (filtroConcepto && m.concepto !== filtroConcepto) return false;
      if (desde || hasta) {
        const dia = diaMadrid(m.fecha);
        if (!dia) return false;
        if (desde && dia < desde) return false;
        if (hasta && dia > hasta) return false;
      }
      if (q) {
        const texto = `${m.referencia} ${m.numero} ${m.cliente} ${m.concepto} ${m.origen}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [movimientos, busqueda, filtroOrigen, filtroConcepto, desde, hasta]);

  const filtrados = useMemo(() => (filtroTipo ? baseSinTipo.filter((m) => m.tipo === filtroTipo) : baseSinTipo), [baseSinTipo, filtroTipo]);

  const resumen = useMemo(() => resumir(baseSinTipo), [baseSinTipo]);
  const diasVisibles = useMemo(() => Array.from(new Set(baseSinTipo.map((m) => diaMadrid(m.fecha)).filter(Boolean))), [baseSinTipo]);
  const totalBanco = useMemo(
    () => redondearSuma(diasVisibles.map((d) => Number(bancoPorDia[d]?.importe_banco) || 0)),
    [diasVisibles, bancoPorDia]
  );
  function redondearSuma(ns: number[]): number {
    return Math.round(ns.reduce((a, b) => a + b, 0) * 100) / 100;
  }

  const hayFiltros = !!(busqueda || filtroTipo || filtroOrigen || filtroConcepto || desde || hasta);
  const soloFiltroTipo = !(busqueda || filtroOrigen || filtroConcepto || desde || hasta);

  // Filas con una cabecera gris por cada día (más reciente primero), igual
  // que Efectivo — la cabecera lleva además la celda editable del banco.
  const filas = useMemo(() => {
    const ordenados = [...filtrados].sort((a, b) => {
      const ta = a.fecha ? new Date(a.fecha).getTime() : 0;
      const tb = b.fecha ? new Date(b.fecha).getTime() : 0;
      return tb - ta || a.id.localeCompare(b.id);
    });
    const out: FilaTabla[] = [];
    let cabecera: Extract<FilaTabla, { clase: "dia" }> | null = null;
    for (const m of ordenados) {
      const dia = diaMadrid(m.fecha);
      if (!cabecera || cabecera.dia !== dia) {
        cabecera = { clase: "dia", dia, n: 0, neto: 0 };
        out.push(cabecera);
      }
      cabecera.n += 1;
      cabecera.neto = Math.round((cabecera.neto + m.importe) * 100) / 100;
      out.push({ clase: "mov", m });
    }
    return out;
  }, [filtrados]);

  const hoy = hoyMadrid();
  const periodoActivo = PERIODOS.find((p) => {
    const [d, h] = p.rango(hoy);
    return d === desde && h === hasta;
  })?.id;

  function aplicarPeriodo(id: string) {
    if (periodoActivo === id) {
      setDesde("");
      setHasta("");
      return;
    }
    const p = PERIODOS.find((x) => x.id === id);
    if (!p) return;
    const [d, h] = p.rango(hoy);
    setDesde(d);
    setHasta(h);
  }

  function alternarTipo(tipo: TipoMovimientoTarjeta) {
    setFiltroTipo((actual) => (actual === tipo ? "" : tipo));
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroTipo("");
    setFiltroOrigen("");
    setFiltroConcepto("");
    setDesde("");
    setHasta("");
  }

  function valorBanco(dia: string): { importe: number; notas: string } {
    if (bancoEditado[dia]) return bancoEditado[dia];
    const guardado = bancoPorDia[dia];
    return { importe: Number(guardado?.importe_banco) || 0, notas: guardado?.notas || "" };
  }

  function esBancoDirty(dia: string): boolean {
    if (!bancoEditado[dia]) return false;
    const guardado = bancoPorDia[dia];
    const importeGuardado = Number(guardado?.importe_banco) || 0;
    const notasGuardadas = guardado?.notas || "";
    return bancoEditado[dia].importe !== importeGuardado || bancoEditado[dia].notas !== notasGuardadas;
  }

  async function guardarBanco(dia: string) {
    const v = valorBanco(dia);
    setGuardandoBanco(dia);
    try {
      const res = await fetch("/api/tarjetas/importes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dia, importe: v.importe, notas: v.notas }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Importe del banco guardado");
      setBancoEditado((prev) => {
        const resto = { ...prev };
        delete resto[dia];
        return resto;
      });
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardandoBanco(null);
    }
  }

  const columnas = 8;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Tarjetas</h1>
          <p className="text-sm text-muted-foreground">Cobros y devoluciones con tarjeta de tickets y facturas, con lo que confirma el banco cada día</p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setFiltroTipo("")}
          aria-pressed={!filtroTipo}
          title="Ver todos los movimientos"
          className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 ${!filtroTipo ? "ring-2 ring-primary/50" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Vendido con tarjeta</p>
              <p className="text-2xl font-bold tabular-nums">{cargando ? "…" : euros(resumen.neto)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hayFiltros ? "Según filtros" : "Todo el historial"} · ver todos</p>
            </div>
            <Bank className="size-8 text-primary/40" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => alternarTipo("cobro")}
          aria-pressed={filtroTipo === "cobro"}
          title="Filtrar por cobros"
          className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 ${filtroTipo === "cobro" ? "ring-2 ring-green-600/60" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Cobrado</p>
              <p className="text-2xl font-bold tabular-nums text-green-600">{cargando ? "…" : euros(resumen.cobros)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hayFiltros && !soloFiltroTipo ? "Según filtros" : "Todo el historial"}</p>
            </div>
            <MoneyRecive className="size-8 text-green-600/40" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => alternarTipo("devolucion")}
          aria-pressed={filtroTipo === "devolucion"}
          title="Filtrar por devoluciones"
          className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 ${filtroTipo === "devolucion" ? "ring-2 ring-red-600/60" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Devuelto</p>
              <p className="text-2xl font-bold tabular-nums text-red-600">{cargando ? "…" : euros(-resumen.devoluciones)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Rectificativas en tarjeta</p>
            </div>
            <ArrowRotateLeft className="size-8 text-red-600/40" />
          </div>
        </button>
        <div className="rounded-xl border bg-card p-4 text-left shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Recibido en banco</p>
              <p className="text-2xl font-bold tabular-nums">{cargando ? "…" : euros(totalBanco)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Anotado para los días visibles</p>
            </div>
            <Bank className="size-8 text-primary/40" />
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
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? ESTILO_TIPO[v as TipoMovimientoTarjeta]?.etiqueta || v : "Todos los movimientos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los movimientos</SelectItem>
            <SelectItem value="cobro">Cobros</SelectItem>
            <SelectItem value="devolucion">Devoluciones</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroOrigen || "__todos__"} onValueChange={(v) => setFiltroOrigen(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? v : "Todos los orígenes")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los orígenes</SelectItem>
            {origenes.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroConcepto || "__todos__"} onValueChange={(v) => setFiltroConcepto(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? v : "Todos los conceptos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los conceptos</SelectItem>
            {conceptos.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Desde</span>
          <Input type="date" className="w-40" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          <span>hasta</span>
          <Input type="date" className="w-40" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          {PERIODOS.map((p) => (
            <Button key={p.id} type="button" size="sm" variant={periodoActivo === p.id ? "default" : "outline"} className="h-8" onClick={() => aplicarPeriodo(p.id)}>
              {p.etiqueta}
            </Button>
          ))}
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
              <TableHead>Hora</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Resguardo / Ref.</TableHead>
              <TableHead>Nº documento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Importe</TableHead>
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

            {!cargando && filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnas} className="py-8 text-center text-muted-foreground">
                  {hayFiltros ? "Ningún movimiento coincide con los filtros" : "Todavía no hay cobros con tarjeta"}
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filas.map((fila) => {
                if (fila.clase === "dia") {
                  const v = valorBanco(fila.dia);
                  const dirty = esBancoDirty(fila.dia);
                  return (
                    <TableRow key={`dia:${fila.dia}`} className="bg-muted hover:bg-muted">
                      <TableCell colSpan={columnas} className="py-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-baseline gap-3 text-xs font-semibold text-muted-foreground">
                            <span className="text-sm">{etiquetaDia(fila.dia)}</span>
                            <span className="font-normal tabular-nums">
                              {fila.n} {fila.n === 1 ? "movimiento" : "movimientos"} · {eurosConSigno(fila.neto)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs text-muted-foreground">Banco:</span>
                            <DecimalInput
                              className="h-7 w-28"
                              placeholder="0,00"
                              value={v.importe}
                              onChange={(n) => setBancoEditado((prev) => ({ ...prev, [fila.dia]: { importe: n, notas: v.notas } }))}
                            />
                            <Input
                              className="h-7 w-40"
                              placeholder="Nota (opcional)"
                              maxLength={500}
                              value={v.notas}
                              onChange={(e) => setBancoEditado((prev) => ({ ...prev, [fila.dia]: { importe: v.importe, notas: e.target.value } }))}
                            />
                            <Button
                              size="sm"
                              variant={dirty ? "default" : "outline"}
                              className="h-7"
                              disabled={guardandoBanco === fila.dia || !dirty}
                              onClick={() => guardarBanco(fila.dia)}
                            >
                              {guardandoBanco === fila.dia ? "Guardando…" : "Guardar"}
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                const m = fila.m;
                const estilo = ESTILO_TIPO[m.tipo];
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatearHora(m.fecha)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${estilo.clase}`}>{estilo.etiqueta}</span>
                    </TableCell>
                    <TableCell className="text-sm">{m.origen || "-"}</TableCell>
                    <TableCell className="max-w-56 text-sm">
                      <span className="line-clamp-2">{m.concepto}</span>
                    </TableCell>
                    <TableCell className="text-sm">{m.referencia || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{m.numero || "-"}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm">{m.cliente || "-"}</TableCell>
                    <TableCell className={`whitespace-nowrap text-right text-sm font-medium tabular-nums ${m.importe < 0 ? "text-red-600" : "text-green-600"}`}>
                      {m.sinImporte ? (
                        <span className="font-normal text-muted-foreground" title="Devolución anterior a que se guardara el importe">
                          Sin importe
                        </span>
                      ) : (
                        eurosConSigno(m.importe)
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
