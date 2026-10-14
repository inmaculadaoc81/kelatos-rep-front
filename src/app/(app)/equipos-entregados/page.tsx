"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BoxTick, Calendar, Refresh2, SearchNormal1, Truck, Warning2, ArrowLeft2, Category2 } from "@/lib/icons";
import { hoyMadrid } from "@/lib/tpv";
import type { EquipoEntregado } from "@/lib/equipos-entregados";
import { DetalleReparacionDialogLazy as DetalleReparacionDialog } from "../reparaciones/detalle-dialog-lazy";
import { CalendarioEntregas } from "./calendario-entregas";
import { TablaEntregas } from "./tabla-entregas";

type Vista = "calendario" | "lista";

function claveMes(mes: Date): string {
  return `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
}

function etiquetaDia(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

function sumarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const f = new Date(a, m - 1, d + n);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

/** KPIs de un conjunto de equipos entregados. "Sin factura" cuenta solo reparaciones Reparado que no son de garantía. */
function calcularKpis(lista: EquipoEntregado[]) {
  let local = 0;
  let mensajeria = 0;
  let sinFactura = 0;
  for (const e of lista) {
    if (e.tipoEntrega === "mensajeria") mensajeria++;
    else local++;
    if (e.estado === "Reparado" && e.tipoIngreso !== "GARANTIA" && !e.documento) sinFactura++;
  }
  return { total: lista.length, local, mensajeria, sinFactura };
}

function Kpi({ titulo, valor, icono, clase = "" }: { titulo: string; valor: string; icono: React.ReactNode; clase?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">{titulo}</p>
          <p className={`text-2xl font-bold tabular-nums ${clase}`}>{valor}</p>
        </div>
        {icono}
      </div>
    </div>
  );
}

/**
 * Equipos entregados (Reparaciones): los equipos que ya salieron del taller (entregados en local o enviados por
 * mensajería), por FECHA DE ENTREGA. Dos vistas: calendario mensual (igual que Facturación del día; al pulsar un
 * día se ve el detalle de ese día) y lista filtrable por fechas. Los KPIs resumen el mes del calendario, o el
 * rango filtrado en la lista. Petición del usuario, 2026-10-14. Solo administradores y la cuenta de empleados
 * (ver puedeVerEquiposEntregados).
 */
export default function EquiposEntregadosPage() {
  const [vista, setVista] = useState<Vista>("calendario");
  const [equipos, setEquipos] = useState<EquipoEntregado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mesActual, setMesActual] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [resguardoDetalle, setResguardoDetalle] = useState<string | null>(null);

  // Filtros de la lista. Por defecto, el mes en curso hasta hoy.
  const [desde, setDesde] = useState(() => `${hoyMadrid().slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(() => hoyMadrid());
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<"" | "local" | "mensajeria">("");

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/equipos-entregados", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEquipos(data.equipos as EquipoEntregado[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Carga inicial (mismo patrón que Facturación del día).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

  const delMes = useMemo(() => {
    const prefijo = claveMes(mesActual);
    return equipos.filter((e) => e.dia.startsWith(prefijo));
  }, [equipos, mesActual]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return equipos.filter((e) => {
      if (desde && e.dia < desde) return false;
      if (hasta && e.dia > hasta) return false;
      if (tipo && e.tipoEntrega !== tipo) return false;
      if (!q) return true;
      return [e.resguardo, e.cliente, e.telefono, e.equipo, e.tecnico, e.documento].some((c) => c.toLowerCase().includes(q));
    });
  }, [equipos, desde, hasta, tipo, busqueda]);

  const kpis = useMemo(() => calcularKpis(vista === "calendario" ? delMes : filtrados), [vista, delMes, filtrados]);
  const periodo = vista === "calendario"
    ? new Date(mesActual).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    : desde || hasta ? `${desde ? etiquetaDia(desde) : "…"} – ${hasta ? etiquetaDia(hasta) : "…"}` : "todo el historial";
  const hoy = hoyMadrid();
  const entregadosHoy = useMemo(() => equipos.filter((e) => e.dia === hoy).length, [equipos, hoy]);

  function atajo(d: string, h: string) {
    setDesde(d);
    setHasta(h);
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <BoxTick className="size-5 text-primary" /> Equipos entregados
          </h1>
          <p className="text-sm text-muted-foreground">
            Equipos que ya salieron del taller (en local o por mensajería), por fecha de entrega. Hoy: {cargando ? "…" : entregadosHoy}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-card p-0.5">
            <Button size="sm" variant={vista === "calendario" ? "default" : "ghost"} className="h-7 gap-1.5 px-2.5" onClick={() => { setVista("calendario"); setDiaSeleccionado(null); }}>
              <Calendar className="size-3.5" /> Calendario
            </Button>
            <Button size="sm" variant={vista === "lista" ? "default" : "ghost"} className="h-7 gap-1.5 px-2.5" onClick={() => setVista("lista")}>
              <Category2 className="size-3.5" /> Lista por fechas
            </Button>
          </div>
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo={`Entregados (${periodo})`} valor={cargando ? "…" : String(kpis.total)} icono={<BoxTick className="size-8 text-primary/40" />} />
        <Kpi titulo="En local" valor={cargando ? "…" : String(kpis.local)} clase="text-emerald-600" icono={<BoxTick className="size-8 text-emerald-600/40" />} />
        <Kpi titulo="Por mensajería" valor={cargando ? "…" : String(kpis.mensajeria)} clase="text-sky-600" icono={<Truck className="size-8 text-sky-600/40" />} />
        <Kpi
          titulo="Reparados sin factura/ticket"
          valor={cargando ? "…" : String(kpis.sinFactura)}
          clase={kpis.sinFactura > 0 ? "text-amber-600" : "text-green-600"}
          icono={<Warning2 className={`size-8 ${kpis.sinFactura > 0 ? "text-amber-600/40" : "text-green-600/40"}`} />}
        />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {vista === "calendario" ? "Los indicadores resumen el mes que se ve en el calendario." : "Los indicadores resumen el rango de fechas y los filtros de la lista."}
        {" "}&quot;Sin factura/ticket&quot; cuenta solo reparaciones en estado Reparado que no son de garantía.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error al cargar: {error}</div>
      )}

      {cargando ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : vista === "calendario" && diaSeleccionado ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDiaSeleccionado(null)}>
              <ArrowLeft2 className="size-3.5" /> Volver al calendario
            </Button>
            <h2 className="text-base font-semibold">Entregas del {etiquetaDia(diaSeleccionado)}</h2>
          </div>
          <TablaEntregas
            equipos={equipos.filter((e) => e.dia === diaSeleccionado).sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))}
            vacio="Ese día no salió ningún equipo."
            onVer={setResguardoDetalle}
          />
        </div>
      ) : vista === "calendario" ? (
        <CalendarioEntregas equipos={equipos} mesActual={mesActual} onCambiarMes={setMesActual} onSeleccionarDia={setDiaSeleccionado} />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Desde</span>
              <Input type="date" className="w-36" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Hasta</span>
              <Input type="date" className="w-36" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-8" onClick={() => atajo(hoy, hoy)}>Hoy</Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => atajo(sumarDias(hoy, -1), sumarDias(hoy, -1))}>Ayer</Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => atajo(sumarDias(hoy, -6), hoy)}>7 días</Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => atajo(`${hoy.slice(0, 7)}-01`, hoy)}>Este mes</Button>
              <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => atajo("", "")}>Todo</Button>
            </div>
            <Select value={tipo || "__todos__"} onValueChange={(v) => setTipo(!v || v === "__todos__" ? "" : (v as "local" | "mensajeria"))}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue>{(v: string) => (v === "local" ? "En local" : v === "mensajeria" ? "Mensajería" : "Todas las entregas")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todas las entregas</SelectItem>
                <SelectItem value="local">En local</SelectItem>
                <SelectItem value="mensajeria">Mensajería</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Resguardo, cliente, equipo, técnico…" className="h-8 w-64 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </div>
          <TablaEntregas equipos={filtrados} vacio="No hay equipos entregados con esos filtros." onVer={setResguardoDetalle} />
          <p className="text-xs text-muted-foreground">{filtrados.length} equipos</p>
        </div>
      )}

      <DetalleReparacionDialog resguardo={resguardoDetalle} onOpenChange={(o) => !o && setResguardoDetalle(null)} onActualizado={cargar} />
    </div>
  );
}
