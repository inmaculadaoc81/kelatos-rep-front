"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";
import { CardPos, Refresh2, SearchNormal1, MoneyRecive, ArrowRotateLeft, Gallery } from "@/lib/icons";
import { resolverBlobImagen, comprimirImagen } from "@/lib/foto-captura";
import { METODOS_TPV, MovimientoTpv, TipoMovimientoTpv, TpvFotoApi, TpvImporteApi, etiquetaMetodoTpv, hoyMadrid } from "@/lib/tpv";

const TOLERANCIA = 0.01;

const ESTILO_TIPO: Record<TipoMovimientoTpv, { etiqueta: string; clase: string }> = {
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

const TIMEZONE = "Europe/Madrid";

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

function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function etiquetaDia(dia: string): string {
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
  | { clase: "mov"; m: MovimientoTpv };

function clave(dia: string, metodo: string): string {
  return `${dia}|${metodo}`;
}

export default function TpvPage() {
  const [segunSistema, setSegunSistema] = useState<Record<string, Record<string, number>>>({});
  const [movimientos, setMovimientos] = useState<MovimientoTpv[]>([]);
  const [importes, setImportes] = useState<TpvImporteApi[]>([]);
  const [fotos, setFotos] = useState<TpvFotoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Declaración por día+método — separada de "importes" (lo ya guardado)
  // para poder mostrar "Guardar" solo si hay un cambio real.
  const [declarado, setDeclarado] = useState<Record<string, { importe: number; notas: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState<string | null>(null);
  const inputFotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/tpv");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setSegunSistema(data.segunSistema);
      setMovimientos(data.movimientos as MovimientoTpv[]);
      setImportes(data.importes as TpvImporteApi[]);
      setFotos(data.fotos as TpvFotoApi[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const importePorDiaMetodo = useMemo(() => {
    const out: Record<string, TpvImporteApi> = {};
    for (const i of importes) out[clave(i.fecha, i.metodo)] = i;
    return out;
  }, [importes]);

  const fotosPorDia = useMemo(() => {
    const out: Record<string, TpvFotoApi[]> = {};
    for (const f of fotos) (out[f.fecha] ||= []).push(f);
    return out;
  }, [fotos]);

  const origenes = useMemo(() => Array.from(new Set(movimientos.map((m) => m.origen).filter(Boolean))).sort(), [movimientos]);

  const baseFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (filtroMetodo && m.metodo !== filtroMetodo) return false;
      if (filtroOrigen && m.origen !== filtroOrigen) return false;
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
  }, [movimientos, busqueda, filtroMetodo, filtroOrigen, desde, hasta]);

  const filtrados = useMemo(() => (filtroTipo ? baseFiltrada.filter((m) => m.tipo === filtroTipo) : baseFiltrada), [baseFiltrada, filtroTipo]);

  const resumen = useMemo(() => {
    let cobros = 0;
    let devoluciones = 0;
    for (const m of baseFiltrada) {
      if (m.tipo === "cobro") cobros += m.importe;
      else devoluciones += -m.importe;
    }
    return { cobros: Math.round(cobros * 100) / 100, devoluciones: Math.round(devoluciones * 100) / 100 };
  }, [baseFiltrada]);

  const hayFiltros = !!(busqueda || filtroTipo || filtroMetodo || filtroOrigen || desde || hasta);
  const soloFiltroTipo = !(busqueda || filtroMetodo || filtroOrigen || desde || hasta);

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

  function alternarTipo(tipo: TipoMovimientoTpv) {
    setFiltroTipo((actual) => (actual === tipo ? "" : tipo));
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroTipo("");
    setFiltroMetodo("");
    setFiltroOrigen("");
    setDesde("");
    setHasta("");
  }

  function valorDeclarado(dia: string, metodo: string): { importe: number; notas: string } {
    const k = clave(dia, metodo);
    if (declarado[k]) return declarado[k];
    const guardado = importePorDiaMetodo[k];
    return { importe: Number(guardado?.importe_declarado) || 0, notas: guardado?.notas || "" };
  }

  function esDirty(dia: string, metodo: string): boolean {
    const k = clave(dia, metodo);
    if (!declarado[k]) return false;
    const guardado = importePorDiaMetodo[k];
    const importeGuardado = Number(guardado?.importe_declarado) || 0;
    const notasGuardadas = guardado?.notas || "";
    return declarado[k].importe !== importeGuardado || declarado[k].notas !== notasGuardadas;
  }

  async function guardarDeclaracion(dia: string, metodo: string) {
    const v = valorDeclarado(dia, metodo);
    const k = clave(dia, metodo);
    setGuardando(k);
    try {
      const res = await fetch("/api/tpv/importes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: dia, metodo, importe: v.importe, notas: v.notas }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Importe declarado guardado");
      setDeclarado((prev) => {
        const resto = { ...prev };
        delete resto[k];
        return resto;
      });
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(null);
    }
  }

  async function onSeleccionarFotos(dia: string, e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;
    setSubiendoFoto(dia);
    try {
      for (const file of archivos) {
        try {
          const blob = await resolverBlobImagen(file);
          const { base64, mime } = await comprimirImagen(blob);
          const res = await fetch("/api/tpv/fotos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha: dia, base64, mimeType: mime, nombre: file.name }),
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Error desconocido");
        } catch (err) {
          toast.error(`No se pudo subir "${file.name}": ${err instanceof Error ? err.message : "error desconocido"}`);
        }
      }
      cargar();
    } finally {
      setSubiendoFoto(null);
    }
  }

  const columnas = 8;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <CardPos className="size-5 text-purple-600" /> TPV
          </h1>
          <p className="text-sm text-muted-foreground">
            Cobros y devoluciones por tarjeta, Bizum o transferencia, con lo que declara el datáfono cada día y método, y el ticket de cierre.
          </p>
        </div>
        <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => setFiltroTipo("")}
          aria-pressed={!filtroTipo}
          title="Ver todos los movimientos"
          className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 ${!filtroTipo ? "ring-2 ring-primary/50" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Neto</p>
              <p className="text-2xl font-bold tabular-nums">{cargando ? "…" : euros(resumen.cobros - resumen.devoluciones)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hayFiltros ? "Según filtros" : "Todo el historial"} · ver todos</p>
            </div>
            <CardPos className="size-8 text-primary/40" />
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
              <p className="mt-0.5 text-xs text-muted-foreground">Rectificativas TPV</p>
            </div>
            <ArrowRotateLeft className="size-8 text-red-600/40" />
          </div>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Resguardo, nº documento, cliente…" className="w-72 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={filtroTipo || "__todos__"} onValueChange={(v) => setFiltroTipo(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? ESTILO_TIPO[v as TipoMovimientoTpv]?.etiqueta || v : "Todos los movimientos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los movimientos</SelectItem>
            <SelectItem value="cobro">Cobros</SelectItem>
            <SelectItem value="devolucion">Devoluciones</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroMetodo || "__todos__"} onValueChange={(v) => setFiltroMetodo(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? etiquetaMetodoTpv(v) : "Todos los métodos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los métodos</SelectItem>
            {METODOS_TPV.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
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
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Resguardo / Ref.</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnas }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnas} className="py-8 text-center text-muted-foreground">
                  {hayFiltros ? "Ningún movimiento coincide con los filtros" : "Todavía no hay movimientos TPV"}
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filas.map((fila) => {
                if (fila.clase === "dia") {
                  const metodosRelevantes = METODOS_TPV.filter(
                    (m) => Math.abs(segunSistema[fila.dia]?.[m.value] || 0) > 0 || !!importePorDiaMetodo[clave(fila.dia, m.value)]
                  );
                  const fotosDia = fotosPorDia[fila.dia] || [];
                  return (
                    <TableRow key={`dia:${fila.dia}`} className="bg-muted hover:bg-muted">
                      <TableCell colSpan={columnas} className="space-y-2 py-2.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold">{etiquetaDia(fila.dia)}</span>
                          <span className="text-xs font-normal tabular-nums text-muted-foreground">
                            {fila.n} {fila.n === 1 ? "movimiento" : "movimientos"} · {eurosConSigno(fila.neto)}
                          </span>
                        </div>

                        {metodosRelevantes.length > 0 && (
                          <div className="space-y-1.5 rounded-md border bg-card p-2" onClick={(e) => e.stopPropagation()}>
                            {metodosRelevantes.map((m) => {
                              const sistema = segunSistema[fila.dia]?.[m.value] || 0;
                              const v = valorDeclarado(fila.dia, m.value);
                              const dirty = esDirty(fila.dia, m.value);
                              const k = clave(fila.dia, m.value);
                              const tieneDeclarado = !!importePorDiaMetodo[k];
                              const diferencia = tieneDeclarado ? Math.round((v.importe - sistema) * 100) / 100 : null;
                              return (
                                <div key={m.value} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
                                  <span className="w-32 shrink-0 text-xs font-medium">{m.label}</span>
                                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                    Sistema: <span className="tabular-nums text-foreground">{euros(sistema)}</span>
                                  </span>
                                  <DecimalInput
                                    className="h-7 w-24"
                                    placeholder="0,00"
                                    value={v.importe}
                                    onChange={(n) => setDeclarado((prev) => ({ ...prev, [k]: { importe: n, notas: v.notas } }))}
                                  />
                                  <Input
                                    className="h-7 flex-1"
                                    placeholder="Nota (opcional)"
                                    maxLength={500}
                                    value={v.notas}
                                    onChange={(e) => setDeclarado((prev) => ({ ...prev, [k]: { importe: v.importe, notas: e.target.value } }))}
                                  />
                                  {diferencia !== null && (
                                    <span className={`shrink-0 text-xs font-medium tabular-nums ${Math.abs(diferencia) <= TOLERANCIA ? "text-green-600" : diferencia > 0 ? "text-blue-600" : "text-red-600"}`}>
                                      {Math.abs(diferencia) <= TOLERANCIA ? "Coincide" : diferencia > 0 ? `Sobran ${euros(diferencia)}` : `Faltan ${euros(Math.abs(diferencia))}`}
                                    </span>
                                  )}
                                  <Button
                                    size="sm"
                                    variant={dirty ? "default" : "outline"}
                                    className="h-7 shrink-0"
                                    disabled={guardando === k || !dirty}
                                    onClick={() => guardarDeclaracion(fila.dia, m.value)}
                                  >
                                    {guardando === k ? "Guardando…" : "Guardar"}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {fotosDia.map((f) => (
                            <a key={f.id} href={`/api/tpv/archivo/${f.drive_file_id}`} target="_blank" rel="noopener noreferrer" className="block size-10 overflow-hidden rounded-md border bg-background" title={f.nombre_original || "Foto de cierre"}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/api/tpv/archivo/${f.drive_file_id}`} alt="Foto de cierre TPV" className="size-full object-cover" />
                            </a>
                          ))}
                          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" disabled={subiendoFoto === fila.dia} onClick={() => inputFotoRefs.current[fila.dia]?.click()}>
                            <Gallery className="size-3.5" /> {subiendoFoto === fila.dia ? "Subiendo…" : "Añadir foto"}
                          </Button>
                          <input
                            ref={(el) => { inputFotoRefs.current[fila.dia] = el; }}
                            type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => onSeleccionarFotos(fila.dia, e)}
                          />
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
                    <TableCell className="whitespace-nowrap text-sm">{etiquetaMetodoTpv(m.metodo)}</TableCell>
                    <TableCell className="text-sm">{m.origen || "-"}</TableCell>
                    <TableCell className="max-w-56 text-sm">
                      <span className="line-clamp-2">{m.concepto}</span>
                    </TableCell>
                    <TableCell className="text-sm">{m.referencia || "-"}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm">{m.cliente || "-"}</TableCell>
                    <TableCell className={`whitespace-nowrap text-right text-sm font-medium tabular-nums ${m.importe < 0 ? "text-red-600" : "text-green-600"}`}>
                      {m.sinImporte ? (
                        <span className="font-normal text-muted-foreground" title="Devolución anterior a que se guardara el importe">Sin importe</span>
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
