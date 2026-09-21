"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, MoneySend, MoneyRecive, ArrowRotateLeft, Coin1, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { EFECTIVO_INICIO_CONTEO, MovimientoConSaldo, MovimientoEfectivo, TipoMovimientoEfectivo, conSaldoAcumulado, resumir } from "@/lib/efectivo";
import { RetirarEfectivoDialog } from "./retirar-efectivo-dialog";
import { AnularRetiradaDialog } from "./anular-retirada-dialog";

const TIMEZONE = "Europe/Madrid";

type ModoConteo = "desde_inicio" | "todo";
const CLAVE_MODO = "kelatos-efectivo-modo-conteo";
const INICIO_ETIQUETA = EFECTIVO_INICIO_CONTEO.split("-").reverse().join("/");

const ESTILO_TIPO: Record<TipoMovimientoEfectivo, { etiqueta: string; clase: string }> = {
  cobro: { etiqueta: "Cobro", clase: "bg-green-500/10 text-green-600" },
  devolucion: { etiqueta: "Devolución", clase: "bg-red-500/10 text-red-600" },
  retirada: { etiqueta: "Retirada", clase: "bg-amber-500/10 text-amber-600" },
  ingreso: { etiqueta: "Ingreso", clase: "bg-sky-500/10 text-sky-600" },
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

/** Hora del movimiento (la fecha ya la da la cabecera del día). Los
    documentos que solo guardan el día llegan a medianoche de Madrid: sin
    hora real, se enseña "—" en vez de un falso "00:00". */
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

/** Suma `n` días a una fecha "AAAA-MM-DD" (aritmética en UTC, sin husos). */
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

/** Atajos de periodo: cada uno da el rango [desde, hasta] respecto a hoy. */
const PERIODOS: { id: string; etiqueta: string; rango: (hoy: string) => [string, string] }[] = [
  { id: "hoy", etiqueta: "Hoy", rango: (h) => [h, h] },
  { id: "ayer", etiqueta: "Ayer", rango: (h) => [sumarDias(h, -1), sumarDias(h, -1)] },
  { id: "7d", etiqueta: "Últimos 7 días", rango: (h) => [sumarDias(h, -6), h] },
  { id: "mes", etiqueta: "Este mes", rango: (h) => [`${h.slice(0, 8)}01`, h] },
];

type FilaTabla = { clase: "dia"; dia: string; n: number; neto: number } | { clase: "mov"; m: MovimientoConSaldo };

export default function EfectivoPage() {
  const [movimientos, setMovimientos] = useState<MovimientoEfectivo[]>([]);
  // Por defecto la caja cuenta desde EFECTIVO_INICIO_CONTEO; "todo" suma también
  // lo anterior. La elección se recuerda en este navegador.
  const [modoConteo, setModoConteo] = useState<ModoConteo>("desde_inicio");
  const [puedeRetirar, setPuedeRetirar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [filtroConcepto, setFiltroConcepto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  // Diálogo de movimiento manual abierto: retirar o añadir efectivo (null = cerrado).
  const [movimientoManual, setMovimientoManual] = useState<"retirada" | "ingreso" | null>(null);
  const [anulando, setAnulando] = useState<MovimientoEfectivo | null>(null);

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
    try {
      if (window.localStorage.getItem(CLAVE_MODO) === "todo") setModoConteo("todo");
    } catch {
      /* sin almacenamiento (ventana privada…): se queda en el valor por defecto */
    }
  }, []);

  function cambiarModo(modo: ModoConteo) {
    setModoConteo(modo);
    try {
      window.localStorage.setItem(CLAVE_MODO, modo);
    } catch {
      /* ignorar */
    }
  }

  // Movimientos que cuentan según el modo: desde el día de inicio de caja, o todos.
  const visibles = useMemo(
    () => (modoConteo === "todo" ? movimientos : movimientos.filter((m) => diaMadrid(m.fecha) >= EFECTIVO_INICIO_CONTEO)),
    [movimientos, modoConteo]
  );
  const textoAlcance = modoConteo === "todo" ? "Todo el historial" : `Desde el ${INICIO_ETIQUETA}`;

  // El saldo se calcula sobre todo lo que cuenta (una fila filtrada sigue
  // mostrando cuánto había en caja justo después de ese movimiento).
  const todos = useMemo(() => conSaldoAcumulado(visibles), [visibles]);
  const saldoActual = todos.length ? todos[0].saldo : 0;
  const origenes = useMemo(() => Array.from(new Set(visibles.map((m) => m.origen).filter(Boolean))).sort(), [visibles]);

  const conceptos = useMemo(
    () => Array.from(new Set(visibles.filter((m) => m.tipo !== "retirada" && m.tipo !== "ingreso").map((m) => m.concepto).filter(Boolean))).sort(),
    [visibles]
  );

  // Todos los filtros MENOS el de tipo: los KPI se calculan sobre esto, para
  // que al pulsar "Cobrado" (filtro por tipo) los otros KPI no se pongan a 0.
  const baseSinTipo = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return todos.filter((m) => {
      if (filtroOrigen && m.origen !== filtroOrigen) return false;
      if (filtroConcepto && m.concepto !== filtroConcepto) return false;
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
  }, [todos, busqueda, filtroOrigen, filtroConcepto, desde, hasta]);

  const filtrados = useMemo(() => (filtroTipo ? baseSinTipo.filter((m) => m.tipo === filtroTipo) : baseSinTipo), [baseSinTipo, filtroTipo]);

  const resumen = useMemo(() => resumir(baseSinTipo), [baseSinTipo]);
  const hayFiltros = !!(busqueda || filtroTipo || filtroOrigen || filtroConcepto || desde || hasta);
  // Los KPI ignoran el filtro de tipo: solo dicen "Según filtros" si hay alguno de los demás.
  const soloFiltroTipo = !(busqueda || filtroOrigen || filtroConcepto || desde || hasta);

  // Filas de la tabla con una cabecera gris por cada día (la lista ya viene
  // ordenada de más reciente a más antiguo).
  const filas = useMemo(() => {
    const out: FilaTabla[] = [];
    let cabecera: Extract<FilaTabla, { clase: "dia" }> | null = null;
    for (const m of filtrados) {
      const dia = diaMadrid(m.fecha);
      if (!cabecera || cabecera.dia !== dia) {
        cabecera = { clase: "dia", dia, n: 0, neto: 0 };
        out.push(cabecera);
      }
      cabecera.n += 1;
      if (!m.anulada) cabecera.neto = Math.round((cabecera.neto + m.importe) * 100) / 100;
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

  /** Los KPI son filtros: pulsar uno filtra por ese tipo, pulsarlo otra vez
      (o "En caja ahora") vuelve a mostrar todos los movimientos. */
  function alternarTipo(tipo: TipoMovimientoEfectivo) {
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

  const columnas = puedeRetirar ? 10 : 9;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Efectivo</h1>
          <p className="text-sm text-muted-foreground">Cobros y devoluciones en efectivo de tickets y facturas, y movimientos manuales de caja</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-card p-0.5" role="group" aria-label="Qué días cuentan en la caja">
            <Button
              type="button"
              size="sm"
              variant={modoConteo === "desde_inicio" ? "default" : "ghost"}
              className="h-7"
              aria-pressed={modoConteo === "desde_inicio"}
              title={`La caja cuenta desde el ${INICIO_ETIQUETA}`}
              onClick={() => cambiarModo("desde_inicio")}
            >
              Desde el {INICIO_ETIQUETA}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modoConteo === "todo" ? "default" : "ghost"}
              className="h-7"
              aria-pressed={modoConteo === "todo"}
              title="Contar también todo lo anterior"
              onClick={() => cambiarModo("todo")}
            >
              Todos los días
            </Button>
          </div>
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          {puedeRetirar && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMovimientoManual("ingreso")}>
              <MoneyRecive className="size-4" /> Añadir efectivo
            </Button>
          )}
          {puedeRetirar && (
            <Button size="sm" className="gap-1.5" onClick={() => setMovimientoManual("retirada")}>
              <MoneySend className="size-4" /> Retirar efectivo
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setFiltroTipo("")}
          aria-pressed={!filtroTipo}
          title="Ver todos los movimientos"
          className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 ${!filtroTipo ? "ring-2 ring-primary/50" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">En caja ahora</p>
              <p className="text-2xl font-bold tabular-nums">{cargando ? "…" : euros(saldoActual)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{textoAlcance} · ver todos</p>
            </div>
            <Coin1 className="size-8 text-primary/40" />
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
              <p className="mt-0.5 text-xs text-muted-foreground">{hayFiltros && !soloFiltroTipo ? "Según filtros" : textoAlcance}</p>
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
              <p className="mt-0.5 text-xs text-muted-foreground">Rectificativas en efectivo</p>
            </div>
            <ArrowRotateLeft className="size-8 text-red-600/40" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => alternarTipo("ingreso")}
          aria-pressed={filtroTipo === "ingreso"}
          title="Filtrar por efectivo añadido a mano"
          className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 ${filtroTipo === "ingreso" ? "ring-2 ring-sky-600/60" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Añadido</p>
              <p className="text-2xl font-bold tabular-nums text-sky-600">{cargando ? "…" : euros(resumen.ingresos)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Efectivo añadido a mano</p>
            </div>
            <MoneyRecive className="size-8 text-sky-600/40" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => alternarTipo("retirada")}
          aria-pressed={filtroTipo === "retirada"}
          title="Filtrar por retiradas"
          className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 ${filtroTipo === "retirada" ? "ring-2 ring-amber-600/60" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Retirado</p>
              <p className="text-2xl font-bold tabular-nums text-amber-600">{cargando ? "…" : euros(-resumen.retiradas)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Retiradas de caja</p>
            </div>
            <MoneySend className="size-8 text-amber-600/40" />
          </div>
        </button>
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
            <SelectItem value="ingreso">Ingresos</SelectItem>
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
        <Select value={filtroConcepto || "__todos__"} onValueChange={(v) => setFiltroConcepto(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? v : "Todos los conceptos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los conceptos</SelectItem>
            {conceptos.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
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

            {!cargando && filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnas} className="py-8 text-center text-muted-foreground">
                  {hayFiltros
                    ? "Ningún movimiento coincide con los filtros"
                    : modoConteo === "todo"
                      ? "Todavía no hay movimientos en efectivo"
                      : `Todavía no hay movimientos en efectivo desde el ${INICIO_ETIQUETA}`}
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filas.map((fila) => {
                if (fila.clase === "dia") {
                  return (
                    <TableRow key={`dia:${fila.dia}`} className="bg-muted hover:bg-muted">
                      <TableCell colSpan={columnas} className="py-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                          <span>{etiquetaDia(fila.dia)}</span>
                          <span className="font-normal tabular-nums">
                            {fila.n} {fila.n === 1 ? "movimiento" : "movimientos"} · {eurosConSigno(fila.neto)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                const m = fila.m;
                const estilo = ESTILO_TIPO[m.tipo];
                return (
                  <TableRow key={m.id} className={m.anulada ? "opacity-50" : undefined}>
                    <TableCell className="whitespace-nowrap text-sm">{formatearHora(m.fecha)}</TableCell>
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
                      {m.retiradaId !== undefined && m.usuario && <span className="block text-xs text-muted-foreground">{m.usuario}</span>}
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
                        {m.retiradaId !== undefined && !m.anulada && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => setAnulando(m)} title="Anular este movimiento">
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

      {puedeRetirar && (
        <RetirarEfectivoDialog
          key={movimientoManual ?? "cerrado"}
          modo={movimientoManual ?? "retirada"}
          open={movimientoManual !== null}
          onOpenChange={(o) => !o && setMovimientoManual(null)}
          saldo={saldoActual}
          onRegistrada={cargar}
        />
      )}
      {puedeRetirar && <AnularRetiradaDialog retirada={anulando} onOpenChange={(o) => !o && setAnulando(null)} onAnulada={cargar} />}
    </div>
  );
}
