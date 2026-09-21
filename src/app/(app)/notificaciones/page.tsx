"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Refresh2, SearchNormal1, Notification, TickCircle, CloseCircle, Sms } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CANALES,
  CATEGORIAS,
  CategoriaNotificacion,
  ESTADOS,
  NotificacionApi,
  ORDEN_CATEGORIAS,
  RespuestaNotificaciones,
  TIPOS_CONOCIDOS,
  categoriaDe,
  etiquetaTipo,
} from "@/lib/notificaciones";
import { DetalleNotificacionDialog } from "./detalle-notificacion-dialog";

const ZONA = "Europe/Madrid";
const TAMANO_PAGINA = 100;

/** Filtro de estado que controlan los KPI de arriba. "sin_email" = fallos
    por no tener el cliente un email válido (nunca se le pudo avisar). */
type FiltroEstado = "" | "enviado" | "fallido" | "sin_email";

const OPCIONES_DIAS = [
  { valor: "30", etiqueta: "Últimos 30 días" },
  { valor: "90", etiqueta: "Últimos 90 días" },
  { valor: "180", etiqueta: "Últimos 180 días" },
  { valor: "365", etiqueta: "Último año" },
  { valor: "3650", etiqueta: "Todo el historial" },
];

function diaMadrid(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("sv-SE", { timeZone: ZONA });
}

function horaMadrid(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
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

type FilaTabla = { clase: "dia"; dia: string; n: number; fallidas: number } | { clase: "fila"; n: NotificacionApi };

const KPI_VACIO = { total: 0, enviado: 0, fallido: 0, sin_email: 0 };

/**
 * Filtros, KPI y paginación los resuelve el servidor (una consulta por
 * cambio de filtro): el navegador solo recibe la página que se ve (100
 * filas) más los totales, aunque el registro tenga decenas de miles.
 */
export default function CentroNotificacionesPage() {
  const [filas, setFilas] = useState<NotificacionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [kEstado, setKEstado] = useState(KPI_VACIO);
  const [kTipos, setKTipos] = useState<Record<string, number>>({});
  const [porDia, setPorDia] = useState<Record<string, { n: number; fallidas: number }>>({});
  const [dias, setDias] = useState("180");
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("");
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaNotificacion | "">("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCanal, setFiltroCanal] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [detalle, setDetalle] = useState<NotificacionApi | null>(null);
  // Descarta respuestas de una consulta anterior si el usuario ya cambió el filtro.
  const consultaActual = useRef(0);

  // La búsqueda de texto espera a que se deje de teclear (evita una consulta por letra).
  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const parametros = useCallback(
    (offset: number) => {
      const p = new URLSearchParams({ dias, limit: String(TAMANO_PAGINA), offset: String(offset) });
      if (busquedaAplicada.trim()) p.set("q", busquedaAplicada.trim());
      if (filtroEstado) p.set("estado", filtroEstado);
      if (filtroCategoria) p.set("categoria", filtroCategoria);
      if (filtroTipo) p.set("tipo", filtroTipo);
      if (filtroCanal) p.set("canal", filtroCanal);
      if (desde) p.set("desde", desde);
      if (hasta) p.set("hasta", hasta);
      return p.toString();
    },
    [dias, busquedaAplicada, filtroEstado, filtroCategoria, filtroTipo, filtroCanal, desde, hasta]
  );

  const cargar = useCallback(async () => {
    const id = ++consultaActual.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/notificaciones?${parametros(0)}`);
      const data = (await res.json()) as RespuestaNotificaciones & { error?: string };
      if (id !== consultaActual.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFilas(data.notificaciones);
      setTotal(data.total);
      setKEstado(data.kpiEstado);
      setKTipos(data.kpiTipos);
      setPorDia(Object.fromEntries(data.porDia.map((d) => [d.dia, { n: d.n, fallidas: d.fallidas }])));
    } catch (e) {
      if (id === consultaActual.current) setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      if (id === consultaActual.current) setCargando(false);
    }
  }, [parametros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function mostrarMas() {
    const id = consultaActual.current;
    setCargandoMas(true);
    try {
      const res = await fetch(`/api/notificaciones?${parametros(filas.length)}`);
      const data = (await res.json()) as RespuestaNotificaciones & { error?: string };
      if (id !== consultaActual.current) return;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setFilas((prev) => {
        const vistos = new Set(prev.map((f) => f.id));
        return [...prev, ...data.notificaciones.filter((f) => !vistos.has(f.id))];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargandoMas(false);
    }
  }

  const kCategoria = useMemo(() => {
    const c: Record<string, number> = {};
    for (const [tipo, n] of Object.entries(kTipos)) c[categoriaDe(tipo)] = (c[categoriaDe(tipo)] || 0) + n;
    return c;
  }, [kTipos]);

  const tabla = useMemo(() => {
    const out: FilaTabla[] = [];
    let diaActual: string | null = null;
    for (const n of filas) {
      const dia = diaMadrid(n.fecha);
      if (diaActual !== dia) {
        diaActual = dia;
        const t = porDia[dia];
        out.push({ clase: "dia", dia, n: t?.n ?? 0, fallidas: t?.fallidas ?? 0 });
      }
      out.push({ clase: "fila", n });
    }
    return out;
  }, [filas, porDia]);

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: ZONA });
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

  const hayFiltros = !!(busqueda || filtroEstado || filtroCategoria || filtroTipo || filtroCanal || desde || hasta);
  function limpiarFiltros() {
    setBusqueda("");
    setBusquedaAplicada("");
    setFiltroEstado("");
    setFiltroCategoria("");
    setFiltroTipo("");
    setFiltroCanal("");
    setDesde("");
    setHasta("");
  }

  const alternarEstado = (f: FiltroEstado) => setFiltroEstado((a) => (a === f ? "" : f));
  const alternarCategoria = (c: CategoriaNotificacion) => setFiltroCategoria((a) => (a === c ? "" : c));

  const claseKpi = (activo: boolean, anillo: string) =>
    `rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 ${activo ? anillo : ""}`;
  const num = (n: number) => (cargando ? "…" : n.toLocaleString("es-ES"));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Centro de notificaciones</h1>
          <p className="text-sm text-muted-foreground">Todo lo que el sistema envía a clientes: correo, hora, tipo y a qué resguardo pertenece</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dias} onValueChange={(v) => v && setDias(v)}>
            <SelectTrigger className="w-48">
              <SelectValue>{(v: string) => OPCIONES_DIAS.find((o) => o.valor === v)?.etiqueta || v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {OPCIONES_DIAS.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="size-8" onClick={() => cargar()} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" aria-pressed={!filtroEstado} onClick={() => setFiltroEstado("")} title="Ver todas" className={claseKpi(!filtroEstado, "ring-2 ring-primary/50")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold tabular-nums">{num(kEstado.total)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Notificaciones · ver todas</p>
            </div>
            <Notification className="size-8 text-primary/40" />
          </div>
        </button>
        <button type="button" aria-pressed={filtroEstado === "enviado"} onClick={() => alternarEstado("enviado")} title="Filtrar por enviadas" className={claseKpi(filtroEstado === "enviado", "ring-2 ring-green-600/60")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Enviadas</p>
              <p className="text-2xl font-bold tabular-nums text-green-600">{num(kEstado.enviado)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Entregadas al servidor de correo</p>
            </div>
            <TickCircle className="size-8 text-green-600/40" />
          </div>
        </button>
        <button type="button" aria-pressed={filtroEstado === "fallido"} onClick={() => alternarEstado("fallido")} title="Filtrar por fallidas" className={claseKpi(filtroEstado === "fallido", "ring-2 ring-red-600/60")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Fallidas</p>
              <p className="text-2xl font-bold tabular-nums text-red-600">{num(kEstado.fallido)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">No llegaron a enviarse</p>
            </div>
            <CloseCircle className="size-8 text-red-600/40" />
          </div>
        </button>
        <button type="button" aria-pressed={filtroEstado === "sin_email"} onClick={() => alternarEstado("sin_email")} title="Clientes a los que no se pudo avisar por no tener email válido" className={claseKpi(filtroEstado === "sin_email", "ring-2 ring-amber-600/60")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Sin email válido</p>
              <p className="text-2xl font-bold tabular-nums text-amber-600">{num(kEstado.sin_email)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Cliente sin poder ser avisado</p>
            </div>
            <Sms className="size-8 text-amber-600/40" />
          </div>
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {ORDEN_CATEGORIAS.map((c) => {
          const activa = filtroCategoria === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={activa}
              onClick={() => alternarCategoria(c)}
              title={`Filtrar por ${CATEGORIAS[c].etiqueta}`}
              className={`rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/40 ${activa ? "ring-2 ring-primary/50" : ""}`}
            >
              <p className="truncate text-xs text-muted-foreground">{CATEGORIAS[c].etiqueta}</p>
              <p className="text-lg font-semibold tabular-nums">{num(kCategoria[c] || 0)}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Resguardo, correo, cliente, asunto…" className="w-72 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={filtroTipo || "__todos__"} onValueChange={(v) => setFiltroTipo(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-64">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? etiquetaTipo(v) : "Todos los tipos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los tipos</SelectItem>
            {TIPOS_CONOCIDOS.map((t) => (
              <SelectItem key={t} value={t}>
                {etiquetaTipo(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroCanal || "__todos__"} onValueChange={(v) => setFiltroCanal(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? CANALES[v] || v : "Todos los canales")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los canales</SelectItem>
            {Object.entries(CANALES).map(([c, etiqueta]) => (
              <SelectItem key={c} value={c}>
                {etiqueta}
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

      {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Tipo de notificación</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Enviado a</TableHead>
              <TableHead>Resguardo / Ref.</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Asunto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && tabla.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  {hayFiltros ? "Ninguna notificación coincide con los filtros" : "Todavía no hay notificaciones registradas"}
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              tabla.map((fila) => {
                if (fila.clase === "dia") {
                  return (
                    <TableRow key={`dia:${fila.dia}`} className="bg-muted hover:bg-muted">
                      <TableCell colSpan={9} className="py-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                          <span>{etiquetaDia(fila.dia)}</span>
                          <span className="font-normal tabular-nums">
                            {fila.n} {fila.n === 1 ? "notificación" : "notificaciones"}
                            {fila.fallidas > 0 && <span className="text-red-600"> · {fila.fallidas} {fila.fallidas === 1 ? "fallida" : "fallidas"}</span>}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                const n = fila.n;
                const est = ESTADOS[n.estado];
                const cat = CATEGORIAS[categoriaDe(n.tipo)];
                return (
                  <TableRow key={n.id} className="cursor-pointer" onClick={() => setDetalle(n)}>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">{horaMadrid(n.fecha)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${est.clase}`} title={n.error || undefined}>
                        {est.etiqueta}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-56 max-w-80 whitespace-normal text-sm font-medium">
                      <span className="line-clamp-2">{etiquetaTipo(n.tipo)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${cat.clase}`}>{cat.etiqueta}</span>
                    </TableCell>
                    <TableCell className="text-sm">{CANALES[n.canal] || n.canal}</TableCell>
                    <TableCell className="max-w-56 truncate text-sm">{n.destinatario || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{n.referencia || "—"}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm">{n.cliente || "—"}</TableCell>
                    <TableCell className="max-w-72 truncate text-sm text-muted-foreground">{n.asunto || "—"}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {!cargando && filas.length < total && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>
            Mostrando {filas.length.toLocaleString("es-ES")} de {total.toLocaleString("es-ES")}
          </span>
          <Button variant="outline" size="sm" disabled={cargandoMas} onClick={mostrarMas}>
            {cargandoMas ? "Cargando…" : `Mostrar ${TAMANO_PAGINA} más`}
          </Button>
        </div>
      )}

      <DetalleNotificacionDialog notificacion={detalle} onOpenChange={(o) => !o && setDetalle(null)} />
    </div>
  );
}
