"use client";

import { useEffect, useMemo, useState } from "react";
import { Refresh2, SearchNormal1, Add, Edit2, Trash, Clock, TickCircle, CloseCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SeguimientoFactura } from "@/lib/seguimiento-facturas";
import { SeguimientoFormDialog } from "./seguimiento-form-dialog";

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-500/10 text-amber-600",
  OK: "bg-green-500/10 text-green-600",
  "NO DISPONIBLE": "bg-red-500/10 text-red-600",
};

export default function SeguimientoFacturasPage() {
  const [entradas, setEntradas] = useState<SeguimientoFactura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<SeguimientoFactura | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/seguimiento-facturas");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setEntradas(data.entradas as SeguimientoFactura[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const metricas = useMemo(
    () => ({
      pendientes: entradas.filter((e) => e.facturaRecibida === "PENDIENTE").length,
      recibidas: entradas.filter((e) => e.facturaRecibida === "OK").length,
      noDisponibles: entradas.filter((e) => e.facturaRecibida === "NO DISPONIBLE").length,
    }),
    [entradas]
  );

  const filtradas = useMemo(() => {
    let lista = entradas;
    if (filtroEstado) lista = lista.filter((e) => e.facturaRecibida === filtroEstado);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(
        (e) =>
          e.numeroPedido.toLowerCase().includes(q) ||
          e.proveedor.toLowerCase().includes(q) ||
          e.numeroFactura.toLowerCase().includes(q) ||
          e.modelo.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [entradas, busqueda, filtroEstado]);

  async function eliminar(entrada: SeguimientoFactura) {
    if (!window.confirm(`¿Eliminar la entrada de seguimiento #${entrada.seguimientoId}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/seguimiento-facturas/${entrada.seguimientoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Entrada eliminada");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Seguimiento Facturas</h1>
          <p className="text-sm text-muted-foreground">Gestión y seguimiento de facturas de compra</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={cargar} title="Actualizar">
            <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditando(null);
              setFormAbierto(true);
            }}
          >
            <Add className="size-4" /> Nueva Entrada
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <button className="rounded-xl border bg-background p-4 text-left shadow-sm" onClick={() => setFiltroEstado("PENDIENTE")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600">{metricas.pendientes}</p>
            </div>
            <Clock className="size-8 text-amber-600/40" />
          </div>
        </button>
        <button className="rounded-xl border bg-background p-4 text-left shadow-sm" onClick={() => setFiltroEstado("OK")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Recibidas</p>
              <p className="text-2xl font-bold text-green-600">{metricas.recibidas}</p>
            </div>
            <TickCircle className="size-8 text-green-600/40" />
          </div>
        </button>
        <button className="rounded-xl border bg-background p-4 text-left shadow-sm" onClick={() => setFiltroEstado("NO DISPONIBLE")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">No Disponibles</p>
              <p className="text-2xl font-bold text-red-600">{metricas.noDisponibles}</p>
            </div>
            <CloseCircle className="size-8 text-red-600/40" />
          </div>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchNormal1 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Pedido, proveedor, factura, modelo..." className="w-72 pl-7" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select value={filtroEstado || "__todos__"} onValueChange={(v) => setFiltroEstado(!v || v === "__todos__" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue>{(v: string) => (v && v !== "__todos__" ? v : "Todos los estados")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="NO DISPONIBLE">No Disponible</SelectItem>
          </SelectContent>
        </Select>
        {filtroEstado && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setFiltroEstado("")}>
            Limpiar filtro
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {error}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Nº Pedido</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Importe</TableHead>
              <TableHead>Nº Factura</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!cargando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Sin entradas
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              filtradas.map((e) => (
                <TableRow key={e.seguimientoId}>
                  <TableCell className="text-sm">{e.fecha ? new Date(e.fecha).toLocaleDateString("es-ES") : "-"}</TableCell>
                  <TableCell className="text-sm">{e.plataforma || "-"}</TableCell>
                  <TableCell className="text-sm">{e.proveedor || "-"}</TableCell>
                  <TableCell className="text-sm">{e.numeroPedido || "-"}</TableCell>
                  <TableCell className="max-w-32 truncate text-sm">{e.modelo || "-"}</TableCell>
                  <TableCell className="text-sm">{e.importe.toFixed(2)} {e.moneda}</TableCell>
                  <TableCell className="text-sm">{e.numeroFactura || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[e.facturaRecibida] || ""}`}>
                      {e.facturaRecibida}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1"
                        onClick={() => {
                          setEditando(e);
                          setFormAbierto(true);
                        }}
                      >
                        <Edit2 className="size-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => eliminar(e)}>
                        <Trash className="size-3.5" /> Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <SeguimientoFormDialog entradaExistente={editando} open={formAbierto} onOpenChange={setFormAbierto} onGuardado={cargar} />
    </div>
  );
}
