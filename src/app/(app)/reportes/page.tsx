"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, TickCircle, Setting2, Wallet, Receipt, Clock, Chart, Warning2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DatosReportes,
  AlertasReportes,
  FiltrosReportes,
  calcularReportes,
  euros,
  etiquetaMes,
  mesActualKey,
} from "@/lib/reportes";
import { Barras, FilaBarra } from "./barras";

const MESES = [
  ["01", "Enero"], ["02", "Febrero"], ["03", "Marzo"], ["04", "Abril"],
  ["05", "Mayo"], ["06", "Junio"], ["07", "Julio"], ["08", "Agosto"],
  ["09", "Septiembre"], ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"],
];

function Delta({ pct, base }: { pct: number | null; base: string }) {
  if (pct === null) return <div className="h-4" />;
  const sube = pct >= 0;
  return (
    <div className={`text-[0.7rem] ${sube ? "text-green-600 dark:text-green-500" : "text-destructive"}`}>
      {sube ? "▲" : "▼"} {sube ? "+" : ""}{pct}% vs {base}
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  icono: Icono,
  color,
  delta,
  detalle,
}: {
  titulo: string;
  valor: string;
  icono: React.ElementType;
  color: string;
  delta?: React.ReactNode;
  detalle?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="mb-1 truncate text-sm text-muted-foreground">{titulo}</p>
          {/* Cifra destacada: figuras proporcionales, no tabulares */}
          <p className="text-2xl font-bold">{valor}</p>
          {delta}
          {detalle && <p className="text-[0.7rem] text-muted-foreground">{detalle}</p>}
        </div>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icono className="size-4" />
        </div>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold">{titulo}</p>
      {children}
    </div>
  );
}

export default function ReportesPage() {
  const [datos, setDatos] = useState<DatosReportes | null>(null);
  const [alertas, setAlertas] = useState<AlertasReportes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<FiltrosReportes["tipo"]>("");
  const [anio, setAnio] = useState("");
  const [mes, setMes] = useState("");
  const [umbral, setUmbral] = useState(14);
  const [diaDesde, setDiaDesde] = useState("");
  const [diaHasta, setDiaHasta] = useState("");

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/reportes?umbral=${umbral}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setDatos(data.datos as DatosReportes);
      setAlertas(data.alertas as AlertasReportes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => cargar(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umbral]);

  const anios = useMemo(() => {
    if (!datos) return [];
    const set = new Set(datos.entradas.map((e) => e.fecha.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [datos]);

  const r = useMemo(
    () => (datos ? calcularReportes(datos, { tipo, anio, mes }) : null),
    [datos, tipo, anio, mes]
  );

  // Rango por defecto del detalle diario: últimos 30 días, o el mes elegido.
  useEffect(() => {
    if (anio && mes) {
      const ultimo = new Date(parseInt(anio, 10), parseInt(mes, 10), 0).getDate();
      setDiaDesde(`${anio}-${mes}-01`);
      setDiaHasta(`${anio}-${mes}-${String(ultimo).padStart(2, "0")}`);
    } else if (!diaDesde && !diaHasta) {
      const hoy = new Date();
      const hace30 = new Date(hoy);
      hace30.setDate(hoy.getDate() - 30);
      setDiaDesde(hace30.toISOString().slice(0, 10));
      setDiaHasta(hoy.toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  const diasFiltrados = useMemo(() => {
    if (!r) return [];
    return r.porDia.filter((d) => (!diaDesde || d.fecha >= diaDesde) && (!diaHasta || d.fecha <= diaHasta));
  }, [r, diaDesde, diaHasta]);

  const barrasDia: FilaBarra[] = diasFiltrados.map((d) => ({
    clave: d.fecha,
    etiqueta: d.fecha.slice(8) + "/" + d.fecha.slice(5, 7),
    valor: d.count,
    valorTexto: String(d.count),
    nota: !tipo ? `${d.rep}R ${d.ven}V` : undefined,
  }));

  const mesActual = mesActualKey();
  const barrasMes: FilaBarra[] = r
    ? r.porMes
        .slice()
        .reverse()
        .map((m) => ({
          clave: m.mes,
          etiqueta: etiquetaMes(m.mes),
          valor: m.ganancia,
          valorTexto: euros(m.ganancia),
          nota: !tipo ? `${m.rep}R ${m.ven}V` : undefined,
          destacada: m.mes === mesActual,
        }))
    : [];

  const hayFiltros = tipo !== "" || anio !== "" || mes !== "";

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Reportes de Reparaciones</h1>
          <p className="text-sm text-muted-foreground">
            Solo se contabilizan reparaciones con estado <strong>Entregado</strong> (caso cerrado)
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={cargar}>
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {/* Una sola fila de filtros por encima de todo lo que condiciona */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
          <Select value={tipo || "__todos__"} onValueChange={(v) => setTipo((!v || v === "__todos__" ? "" : v) as FiltrosReportes["tipo"])}>
            <SelectTrigger className="w-44">
              <SelectValue>
                {(v: string) => (v === "reparacion" ? "Reparaciones" : v === "venta" ? "Ventas de piezas" : "Todos los tipos")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos los tipos</SelectItem>
              <SelectItem value="reparacion">Reparaciones</SelectItem>
              <SelectItem value="venta">Ventas de piezas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Año</label>
          <Select value={anio || "__todos__"} onValueChange={(v) => setAnio(!v || v === "__todos__" ? "" : v)}>
            <SelectTrigger className="w-32">
              <SelectValue>{(v: string) => (v && v !== "__todos__" ? v : "Todos")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos los años</SelectItem>
              {anios.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Mes</label>
          <Select value={mes || "__todos__"} onValueChange={(v) => setMes(!v || v === "__todos__" ? "" : v)}>
            <SelectTrigger className="w-36">
              <SelectValue>
                {(v: string) => MESES.find(([k]) => k === v)?.[1] ?? "Todos los meses"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos los meses</SelectItem>
              {MESES.map(([k, n]) => (
                <SelectItem key={k} value={k}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-2 border-l pl-3">
          <label className="mb-1 block text-xs text-muted-foreground">Detalle diario: desde</label>
          <Input type="date" className="w-40" value={diaDesde} onChange={(e) => setDiaDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">hasta</label>
          <Input type="date" className="w-40" value={diaHasta} onChange={(e) => setDiaHasta(e.target.value)} />
        </div>
        {hayFiltros && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { setTipo(""); setAnio(""); setMes(""); }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar reportes: {error}
        </div>
      )}

      {cargando && !r && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {r && (
        <div className={cargando ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {/* KPIs */}
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              titulo={tipo === "venta" ? `Ventas ${r.periodoLabel}` : tipo === "reparacion" ? `Reparaciones ${r.periodoLabel}` : `Cerradas ${r.periodoLabel}`}
              valor={String(r.cerradasPeriodo)}
              icono={TickCircle}
              color="bg-blue-500/10 text-blue-600"
              delta={<Delta pct={r.deltaCerradas} base={r.mesAnteriorLabel} />}
            />
            <Kpi
              titulo={tipo === "venta" ? "Total ventas" : tipo === "reparacion" ? "Total reparaciones" : "Total cerradas"}
              valor={String(r.totalEntradas)}
              icono={Setting2}
              color="bg-slate-500/10 text-slate-600"
              detalle="acumulado del filtro activo"
            />
            <Kpi
              titulo={`Ganancia neta ${r.periodoLabel}`}
              valor={euros(r.gananciaPeriodo)}
              icono={Wallet}
              color="bg-emerald-500/10 text-emerald-600"
              delta={<Delta pct={r.deltaGanancia} base={r.mesAnteriorLabel} />}
            />
            <Kpi
              titulo="Ticket medio"
              valor={euros(r.ticketMedio)}
              icono={Receipt}
              color="bg-amber-500/10 text-amber-600"
              delta={<Delta pct={r.deltaTicket} base={r.mesAnteriorLabel} />}
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              titulo="Tasa de cierre"
              valor={r.tasaCierre !== null ? `${r.tasaCierre} %` : "—"}
              icono={Chart}
              color="bg-cyan-500/10 text-cyan-600"
              detalle={r.totalReparadas + r.totalSinReparacion > 0 ? `${r.totalReparadas} reparadas · ${r.totalSinReparacion} sin arreglo` : undefined}
            />
            <Kpi
              titulo="Tiempo medio reparación"
              valor={r.tiempoMedio !== null ? `${r.tiempoMedio} días` : "—"}
              icono={Clock}
              color="bg-violet-500/10 text-violet-600"
              detalle={r.muestraTiempo > 0 ? `sobre ${r.muestraTiempo} reparaciones` : undefined}
            />
          </div>

          {/* Gráficos temporales */}
          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <Tarjeta titulo={`Reparaciones cerradas por día${diaDesde && diaHasta ? ` · ${diaDesde} → ${diaHasta}` : ""}`}>
              <Barras filas={barrasDia} color="count" anchoEtiqueta="w-12" anchoValor="w-8" vacio="Sin días en el rango" />
            </Tarjeta>
            <Tarjeta titulo="Ganancia neta por mes">
              <Barras filas={barrasMes} color="money" anchoEtiqueta="w-20" anchoValor="w-24" vacio="Sin datos históricos" />
            </Tarjeta>
          </div>

          {/* Rankings */}
          <div className="mb-4 grid gap-3 lg:grid-cols-3">
            <Tarjeta titulo="Top modelos reparados">
              <Barras
                filas={r.topModelos.map((m) => ({ clave: m.nombre, etiqueta: m.nombre, valor: m.count, valorTexto: String(m.count) }))}
                color="count"
                anchoEtiqueta="w-28"
                anchoValor="w-8"
                maxAltura="max-h-64"
                medallas
              />
            </Tarjeta>
            <Tarjeta titulo="Top averías">
              <Barras
                filas={r.topSintomas.map((s) => ({ clave: s.nombre, etiqueta: s.nombre, valor: s.count, valorTexto: String(s.count) }))}
                color="count"
                anchoEtiqueta="w-28"
                anchoValor="w-8"
                maxAltura="max-h-64"
                medallas
              />
            </Tarjeta>
            <Tarjeta titulo="Por técnico · ganancia">
              <Barras
                filas={r.topTecnicos.map((t) => ({ clave: t.nombre, etiqueta: t.nombre, valor: t.ganancia, valorTexto: euros(t.ganancia), nota: `${t.count}` }))}
                color="money"
                anchoEtiqueta="w-24"
                anchoValor="w-20"
                maxAltura="max-h-64"
              />
            </Tarjeta>
          </div>

          {/* Recepciones */}
          <div className="mb-4">
            <Tarjeta titulo={`Equipos recibidos por día · ${r.totalRecepciones} en total`}>
              <Barras
                filas={r.recepcionesPorDia.slice(-40).map((d) => ({
                  clave: d.fecha,
                  etiqueta: d.fecha.slice(8) + "/" + d.fecha.slice(5, 7),
                  valor: d.count,
                  valorTexto: String(d.count),
                }))}
                color="count"
                anchoEtiqueta="w-12"
                anchoValor="w-8"
                maxAltura="max-h-56"
              />
            </Tarjeta>
          </div>

          {/* Tabla de detalle — la vista tabular equivalente al gráfico diario */}
          <div className="mb-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Detalle por día</p>
              <Badge variant="outline">{diasFiltrados.length} días</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Reparaciones</TableHead>
                    <TableHead className="text-center">Ventas</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diasFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Sin datos en el rango</TableCell>
                    </TableRow>
                  )}
                  {diasFiltrados.slice().reverse().map((d) => (
                    <TableRow key={d.fecha}>
                      <TableCell className="tabular-nums">{d.fecha}</TableCell>
                      <TableCell className="text-center tabular-nums">{d.rep}</TableCell>
                      <TableCell className="text-center tabular-nums">{d.ven}</TableCell>
                      <TableCell className="text-right tabular-nums">{euros(d.ganancia)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Alertas */}
          <div className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Warning2 className="size-4 text-destructive" /> Alertas
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Sin movimiento ≥
                <Input
                  type="number"
                  min={1}
                  max={365}
                  className="h-8 w-20"
                  value={umbral}
                  onChange={(e) => setUmbral(Math.max(1, Math.min(365, parseInt(e.target.value) || 14)))}
                />
                días
              </div>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-destructive">
                  Reparaciones abiertas sin movimiento ({alertas?.reparacionesAbiertas.length ?? 0})
                </p>
                <div className="max-h-60 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resguardo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Días</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!alertas || alertas.reparacionesAbiertas.length === 0) && (
                        <TableRow><TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">Ninguna</TableCell></TableRow>
                      )}
                      {alertas?.reparacionesAbiertas.slice(0, 100).map((a) => (
                        <TableRow key={a.resguardo}>
                          <TableCell className="text-xs font-semibold tabular-nums">{a.resguardo}</TableCell>
                          <TableCell className="max-w-32 truncate text-xs" title={a.cliente}>{a.cliente || "-"}</TableCell>
                          <TableCell className="text-xs">{a.estado || "-"}</TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums">{a.diasAbierta}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-amber-600">
                  Presupuestos pendientes de respuesta ({alertas?.presupuestosPendientes.length ?? 0})
                </p>
                <div className="max-h-60 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resguardo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Días</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!alertas || alertas.presupuestosPendientes.length === 0) && (
                        <TableRow><TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">Ninguno</TableCell></TableRow>
                      )}
                      {alertas?.presupuestosPendientes.slice(0, 100).map((p) => (
                        <TableRow key={p.resguardo}>
                          <TableCell className="text-xs font-semibold tabular-nums">{p.resguardo}</TableCell>
                          <TableCell className="max-w-32 truncate text-xs" title={p.cliente}>{p.cliente || "-"}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{euros(p.total)}</TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums">{p.diasPendiente ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
