"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, Edit2, Eye } from "@/lib/icons";
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
import { Venta, estadoVentaMostrado, numerosPedidoDeVenta } from "@/lib/ventas";
import { NuevoPedidoDialog } from "./nuevo-pedido-dialog";
import { EditarVentaDialog } from "./editar-venta-dialog";
import { DetalleVentaDialog } from "./detalle-venta-dialog";

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [ventaEditando, setVentaEditando] = useState<Venta | null>(null);
  const [ventaVerId, setVentaVerId] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filtroEstado) qs.set("estado", filtroEstado);
      if (busqueda.trim()) qs.set("busqueda", busqueda.trim());
      const res = await fetch(`/api/ventas?${qs.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setVentas(data.ventas as Venta[]);
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
  }, [busqueda, filtroEstado]);

  const conTotales = useMemo(
    () =>
      ventas.map((v) => ({
        venta: v,
        total: v.items.reduce((s, i) => s + i.precio, 0),
        ganancia: v.items.reduce((s, i) => s + (i.precio - i.costo), 0),
        numeroPedido: numerosPedidoDeVenta(v),
      })),
    [ventas]
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Pedidos de piezas (ventas)</h1>
          <p className="text-sm text-muted-foreground">Gestión de pedidos de piezas a clientes (sin reparación)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <NuevoPedidoDialog onCreado={cargar} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por cliente o ID..." className="w-64 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={filtroEstado || "__todos__"} onValueChange={(v) => setFiltroEstado(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-56">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? v : "Todos los estados")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los estados</SelectItem>
            <SelectItem value="Pieza Pendiente">Pieza Pendiente</SelectItem>
            <SelectItem value="En Tránsito">En Tránsito</SelectItem>
            <SelectItem value="Pieza Recibida">Pieza Recibida</SelectItem>
            <SelectItem value="Entregado">Entregado</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar ventas: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Nº Items</TableHead>
              <TableHead>Nº Pedido</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Ganancia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 11 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && conTotales.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  No se encontraron pedidos
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              conTotales.map(({ venta: v, total, ganancia, numeroPedido }) => {
                const estadoInfo = estadoVentaMostrado(v);
                return (
                  <TableRow key={v.ventaId} className="cursor-pointer" onClick={() => setVentaVerId(v.ventaId)}>
                    <TableCell className="font-semibold">{v.ventaId}</TableCell>
                    <TableCell className="text-sm">{v.fecha ? new Date(v.fecha).toLocaleDateString("es-ES") : "-"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{v.clienteNombre || "-"}</div>
                      <div className="text-xs text-muted-foreground">{v.clienteTelefono}</div>
                      <div className="text-xs text-muted-foreground">{v.clienteEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm">{v.items.length} pieza{v.items.length !== 1 ? "s" : ""}</TableCell>
                    <TableCell className="text-sm">{numeroPedido}</TableCell>
                    <TableCell className="text-sm">{total.toFixed(2)} €</TableCell>
                    <TableCell className={`text-sm ${ganancia >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>{ganancia.toFixed(2)} €</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: estadoInfo.estilo.bg, color: estadoInfo.estilo.color || "#fff" }}>
                        {estadoInfo.texto}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{v.numeroFactura || "-"}</TableCell>
                    <TableCell className="max-w-32 truncate text-sm text-muted-foreground" title={v.observaciones}>
                      {v.observaciones || "-"}
                    </TableCell>
                    <TableCell className="text-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="mr-1 h-7 gap-1" onClick={() => setVentaVerId(v.ventaId)}>
                        <Eye className="size-3.5" /> Ver
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Editar cabecera" onClick={() => setVentaEditando(v)}>
                        <Edit2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <Badge variant="outline" className="mt-3">
        {ventas.length} ventas
      </Badge>

      <EditarVentaDialog venta={ventaEditando} open={ventaEditando !== null} onOpenChange={(o) => !o && setVentaEditando(null)} onGuardado={cargar} />
      <DetalleVentaDialog ventaId={ventaVerId} open={ventaVerId !== null} onOpenChange={(o) => !o && setVentaVerId(null)} onActualizado={cargar} />
    </div>
  );
}
