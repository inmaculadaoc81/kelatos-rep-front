"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, Eye, Star } from "@/lib/icons";
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
import { Reparacion, COLOR_ESTADO } from "@/lib/reparaciones";
import { formatearFecha } from "@/lib/dias-entrega";
import { DetalleReparacionDialog } from "../reparaciones/detalle-dialog";

function EstadoBadge({ estado }: { estado: string }) {
  const color = COLOR_ESTADO[estado];
  if (!color) return <Badge variant="secondary">{estado}</Badge>;
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
      {estado}
    </span>
  );
}

const ENTREGA_LABEL: Record<string, string> = { ENTREGADO: "Entregado en local", ENVIO: "Envío mensajería", RECICLAJE: "Reciclaje" };

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

      <div className="rounded-lg border">
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
              <TableHead>Acciones</TableHead>
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
                <TableRow key={r.resguardo}>
                  <TableCell className="font-semibold">{r.resguardo}</TableCell>
                  <TableCell className="text-sm">{r.cliente.nombre || "-"}</TableCell>
                  <TableCell className="text-sm">{r.equipo.modelo || "-"}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={r.estado} />
                  </TableCell>
                  <TableCell className="text-sm">{ENTREGA_LABEL[r.estadoEntrega] || r.estadoEntrega || "-"}</TableCell>
                  <TableCell className="text-sm">{r.numeroFactura || "-"}</TableCell>
                  <TableCell className="text-sm">{formatearFecha(r.fechaEntrega)}</TableCell>
                  <TableCell className="text-sm">{r.tecnicoAsignado || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {r.resena === "SI" ? <Star className="size-4 fill-amber-400 text-amber-400" /> : "-"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setResguardoDetalle(r.resguardo)}>
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

      <DetalleReparacionDialog resguardo={resguardoDetalle} onOpenChange={(o) => !o && setResguardoDetalle(null)} />
    </div>
  );
}
