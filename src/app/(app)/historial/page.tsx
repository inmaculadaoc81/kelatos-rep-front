"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Refresh2, SearchNormal1, Eye, ShieldTick, DocumentText, Copy,
  BoxTick, Trash, Clock, Truck, Receipt, Danger, Calendar, Setting2,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Reparacion, COLOR_ESTADO } from "@/lib/reparaciones";
import { formatearFecha } from "@/lib/dias-entrega";
import { DetalleReparacionDialogLazy as DetalleReparacionDialog } from "../reparaciones/detalle-dialog-lazy";

function EstadoBadge({ estado }: { estado: string }) {
  const color = COLOR_ESTADO[estado];
  if (!color) return <Badge variant="secondary">{estado}</Badge>;
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
      {estado}
    </span>
  );
}

// Reproduce obtenerBadgeEntrega() (Index.html) — mismos colores/iconos por estadoEntrega.
const ENTREGA_BADGE: Record<string, { clase: string; icono: typeof BoxTick; label: string }> = {
  ENTREGADO: { clase: "bg-emerald-600 text-white", icono: BoxTick, label: "ENTREGADO" },
  RECICLAJE: { clase: "bg-muted-foreground text-white", icono: Trash, label: "RECICLAJE" },
  PENDIENTE: { clase: "bg-amber-500 text-white", icono: Clock, label: "PENDIENTE" },
  ENVIO: { clase: "bg-sky-500 text-white", icono: Truck, label: "ENVIO" },
};

function EntregaBadge({ estado }: { estado: string }) {
  const cfg = ENTREGA_BADGE[estado] || ENTREGA_BADGE.PENDIENTE;
  const Icono = cfg.icono;
  return (
    <Badge className={`gap-1 ${cfg.clase}`}>
      <Icono className="size-3" /> {cfg.label}
    </Badge>
  );
}

// Reproduce la celda de Factura de renderizarTablaHistorial(): garantía no
// factura, Reparado/Presupuesto Aceptado sí (número si existe, si no
// "Pendiente"), el resto sin nada que mostrar.
function FacturaCelda({ r }: { r: Reparacion }) {
  const esGarantia = r.tipoIngreso === "GARANTIA";
  const requiereFactura = !esGarantia && (r.estado === "Reparado" || r.estado === "Presupuesto Aceptado");
  if (esGarantia) {
    return <Badge className="gap-1 bg-muted-foreground text-white"><ShieldTick className="size-3" /> Garantía</Badge>;
  }
  if (requiereFactura) {
    return r.numeroFactura ? (
      <Badge className="gap-1 bg-emerald-600 text-white"><Receipt className="size-3" /> {r.numeroFactura}</Badge>
    ) : (
      <Badge className="gap-1 bg-amber-500 text-white"><Danger className="size-3" /> Pendiente</Badge>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function ResenaCelda({ resena }: { resena: string }) {
  const v = (resena || "NO").toUpperCase();
  if (v === "PROGRAMADA") return <Badge className="gap-1 bg-emerald-600 text-white"><Calendar className="size-3" /> Programada</Badge>;
  if (v === "SI") return <Badge className="bg-emerald-600 text-white">Sí</Badge>;
  return <Badge variant="secondary">No</Badge>;
}

const ENTREGA_LABEL: Record<string, string> = { ENTREGADO: "Entregado en local", ENVIO: "Envío mensajería", RECICLAJE: "Reciclaje" };

/** Reproduce abrirReparacionDesdeFacturas() del original — Facturas de
    Clientes enlaza aquí con ?resguardo=X para abrir el detalle directamente. */
function AbrirDetallePorQuery({ onAbrir }: { onAbrir: (resguardo: string) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const resguardo = searchParams.get("resguardo");
    if (resguardo) {
      onAbrir(resguardo);
      router.replace("/historial");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export default function HistorialPage() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroEntrega, setFiltroEntrega] = useState("");
  const [filtroFactura, setFiltroFactura] = useState("");
  const [resguardoDetalle, setResguardoDetalle] = useState<string | null>(null);
  const [reparandoFechas, setReparandoFechas] = useState(false);

  async function repararFechas() {
    setReparandoFechas(true);
    try {
      const res = await fetch("/api/reparaciones/reparar-fechas", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      const partes = [`${data.arregladas} fechas reparación corregidas`];
      if (data.sinHistorial > 0) partes.push(`${data.sinHistorial} sin historial, usaron fallback`);
      if (data.entregaArregladas > 0) partes.push(`${data.entregaArregladas} fechas entrega`);
      toast.success(partes.join(" · "));
      if (data.arregladas > 0 || data.entregaArregladas > 0) cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setReparandoFechas(false);
    }
  }

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ finalizadas: "true", porPagina: "0" });
      if (busqueda.trim()) qs.set("busqueda", busqueda.trim());
      if (fechaDesde) qs.set("fechaDesde", fechaDesde);
      if (fechaHasta) qs.set("fechaHasta", fechaHasta);
      if (filtroEntrega) qs.set("estadoRecogida", filtroEntrega);
      if (filtroFactura) qs.set("factura", filtroFactura);
      const res = await fetch(`/api/reparaciones?${qs.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setReparaciones(data.resultados as Reparacion[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => cargar(), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, fechaDesde, fechaHasta, filtroEntrega, filtroFactura]);

  const conteo = useMemo(() => reparaciones.length, [reparaciones]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Historial de Reparaciones</h1>
          <p className="text-sm text-muted-foreground">Reparaciones finalizadas y entregadas</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={cargar}>
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <div className="relative">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Resguardo, cliente, equipo..." className="w-56 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
          <Input type="date" className="w-36" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
          <Input type="date" className="w-36" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <Select value={filtroEntrega || "__todos__"} onValueChange={(v) => setFiltroEntrega(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue>{(v: string) => ENTREGA_LABEL[v] ?? "Todos los estados"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los estados</SelectItem>
            <SelectItem value="ENTREGADO">Entregado en local</SelectItem>
            <SelectItem value="ENVIO">Envío mensajería</SelectItem>
            <SelectItem value="RECICLAJE">Reciclaje</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroFactura || "__todos__"} onValueChange={(v) => setFiltroFactura(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue>{(v: string) => (v === "con" ? "Con factura" : v === "sin" ? "Sin factura" : "Factura: Todos")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Factura: Todos</SelectItem>
            <SelectItem value="con">Con factura</SelectItem>
            <SelectItem value="sin">Sin factura</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-amber-500 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          onClick={repararFechas}
          disabled={reparandoFechas}
          title="Rellena fecha_reparacion y fecha_entrega en blanco para registros históricos"
        >
          <Setting2 className={`size-3.5 ${reparandoFechas ? "animate-spin" : ""}`} /> {reparandoFechas ? "Reparando..." : "Reparar fechas"}
        </Button>
        {(busqueda || fechaDesde || fechaHasta || filtroEntrega || filtroFactura) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setBusqueda("");
              setFechaDesde("");
              setFechaHasta("");
              setFiltroEntrega("");
              setFiltroFactura("");
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar historial: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resguardo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado Final</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Reseña</TableHead>
              <TableHead className="sticky right-0 bg-card shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.15)]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && reparaciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  No se encontraron resultados
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              reparaciones.map((r) => (
                <TableRow
                  key={r.resguardo}
                  className="group cursor-pointer"
                  onClick={() => setResguardoDetalle(r.resguardo)}
                  title={`Abrir reparación ${r.resguardo}`}
                >
                  <TableCell className="font-semibold">{r.resguardo}</TableCell>
                  <TableCell className="max-w-52 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{r.cliente.nombre || "N/A"}</span>
                      {r.tipoIngreso === "GARANTIA" && (
                        <Badge className="shrink-0 gap-1 bg-slate-800 text-white"><ShieldTick className="size-3" /> Garantía</Badge>
                      )}
                      {r.tipoIngreso === "formulario_web" && (
                        <Badge className="shrink-0 gap-1 bg-sky-500 text-white" title="Solicitud recibida vía formulario web">
                          <DocumentText className="size-3" /> Web
                        </Badge>
                      )}
                    </div>
                    {r.cliente.telefono && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{r.cliente.telefono}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          title="Copiar teléfono"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(r.cliente.telefono);
                            toast.success("Teléfono copiado");
                          }}
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.equipo.modelo || "-"}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={r.estado} />
                  </TableCell>
                  <TableCell className="text-sm"><EntregaBadge estado={r.estadoEntrega || "PENDIENTE"} /></TableCell>
                  <TableCell className="text-sm"><FacturaCelda r={r} /></TableCell>
                  <TableCell className="text-sm">{formatearFecha(r.fechaEntrega)}</TableCell>
                  <TableCell className="text-sm">{r.tecnicoAsignado || "-"}</TableCell>
                  <TableCell className="text-sm">
                    <ResenaCelda resena={r.resena} />
                  </TableCell>
                  <TableCell className="sticky right-0 bg-card shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.15)] group-hover:bg-muted/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1"
                      onClick={(e) => { e.stopPropagation(); setResguardoDetalle(r.resguardo); }}
                    >
                      <Eye className="size-3.5" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Badge variant="outline" className="mt-3">
        {conteo} resultados
      </Badge>

      <DetalleReparacionDialog resguardo={resguardoDetalle} onOpenChange={(o) => !o && setResguardoDetalle(null)} onActualizado={cargar} />

      <Suspense fallback={null}>
        <AbrirDetallePorQuery onAbrir={setResguardoDetalle} />
      </Suspense>
    </div>
  );
}
