"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Wallet, AddCircle, TickCircle, RotateLeft, Refresh2, Clock, Money, ArrowRotateLeft, SearchNormal1, CloseCircle, Edit2, Eye } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "../stat-card";
import { ConfirmarDialog } from "../confirmar-dialog";
import { NuevaDevolucionDialog } from "./nueva-devolucion-dialog";
import { CompletarDevolucionDialog } from "./completar-devolucion-dialog";
import { DetalleDevolucionDialog } from "./detalle-devolucion-dialog";

export interface Devolucion {
  id: number;
  fecha_registro: string;
  nombre_cliente: string | null;
  email: string | null;
  telefono: string | null;
  importe: string | null;
  motivo: string | null;
  motivo_detalle: string | null;
  numero_cuenta: string | null;
  banco: string | null;
  nombre_beneficiario: string | null;
  link_foto: string | null;
  estado: string;
  enviado_por: string | null;
  pais: string | null;
  fecha_cierre: string | null;
  observaciones_cierre: string | null;
  link_comprobante_pago: string | null;
  cerrado_por: string | null;
  comentarios: string | null;
}

const MOTIVOS_DEVOLUCION = ["Dev Fianza", "Dev Garantía", "Depósito Errado", "Exceso de Transferencia", "Otro"];

/** Módulo de Devoluciones (reembolsos a clientes) — puerto del módulo de "Transferencias-2". */
export default function DevolucionesPage() {
  const [items, setItems] = useState<Devolucion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState({ pendientes: 0, completadas: 0, importePendiente: 0, importeDevuelto: 0 });
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [completando, setCompletando] = useState<Devolucion | null>(null);
  const [editando, setEditando] = useState<Devolucion | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState<Devolucion | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [resItems, resContador] = await Promise.all([fetch("/api/devoluciones"), fetch("/api/devoluciones/contador")]);
      const dataItems = await resItems.json();
      if (!dataItems.ok) throw new Error(dataItems.error || "Error desconocido");
      setItems(dataItems.items as Devolucion[]);

      const dataContador = await resContador.json();
      if (dataContador.ok) {
        setResumen({
          pendientes: dataContador.pendientes,
          completadas: dataContador.completadas,
          importePendiente: dataContador.importePendiente,
          importeDevuelto: dataContador.importeDevuelto,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const [aRevertir, setARevertir] = useState<Devolucion | null>(null);
  const [revirtiendo, setRevirtiendo] = useState(false);

  async function confirmarRevertir() {
    if (!aRevertir) return;
    setRevirtiendo(true);
    try {
      const res = await fetch(`/api/devoluciones/${aRevertir.id}/revertir`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(`Devolución #${aRevertir.id} revertida a Pendiente`);
      setARevertir(null);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setRevirtiendo(false);
    }
  }

  const itemsFiltrados = useMemo(() => {
    const filtro = busqueda.toLowerCase().trim();
    return items.filter((d) => {
      const textoOk =
        !filtro ||
        (d.nombre_cliente || "").toLowerCase().includes(filtro) ||
        (d.motivo || "").toLowerCase().includes(filtro) ||
        (d.banco || "").toLowerCase().includes(filtro);
      const estadoOk = !filtroEstado || d.estado === filtroEstado;
      const motivoOk = !filtroMotivo || d.motivo === filtroMotivo;
      let fechaOk = true;
      if (fechaDesde || fechaHasta) {
        const fn = d.fecha_registro.slice(0, 10);
        if (fechaDesde && fn < fechaDesde) fechaOk = false;
        if (fechaHasta && fn > fechaHasta) fechaOk = false;
      }
      return textoOk && estadoOk && motivoOk && fechaOk;
    });
  }, [items, busqueda, filtroEstado, filtroMotivo, fechaDesde, fechaHasta]);

  const hayFiltrosActivos = !!(busqueda || filtroEstado || filtroMotivo || fechaDesde || fechaHasta);
  function limpiarFiltrosDev() {
    setBusqueda(""); setFiltroEstado(""); setFiltroMotivo(""); setFechaDesde(""); setFechaHasta("");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Clock} value={resumen.pendientes} label="Pendientes" colorClase="bg-amber-500/10 text-amber-600" />
        <StatCard icon={TickCircle} value={resumen.completadas} label="Completadas" colorClase="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={Money} value={`${resumen.importePendiente.toFixed(2)} €`} label="Importe pendiente" colorClase="bg-destructive/10 text-destructive" />
        <StatCard icon={ArrowRotateLeft} value={`${resumen.importeDevuelto.toFixed(2)} €`} label="Importe devuelto" colorClase="bg-primary/10 text-primary" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="size-5" />
          </span>
          <h1 className="text-lg font-semibold">Devoluciones</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={cargar} disabled={cargando}>
            <Refresh2 className={`size-3.5 ${cargando ? "animate-spin" : ""}`} /> Actualizar
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setNuevaAbierta(true)}>
            <AddCircle className="size-4" /> Nueva devolución
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">Error: {error}</div>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
          <div className="relative min-w-48 flex-1">
            <SearchNormal1 className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente, motivo, banco..." className="pl-8" />
          </div>
          <Select value={filtroEstado || "todos"} onValueChange={(v) => v && setFiltroEstado(v === "todos" ? "" : v)}>
            <SelectTrigger className="w-auto min-w-32"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Estado: Todos</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="Completada">Completada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroMotivo || "todos"} onValueChange={(v) => v && setFiltroMotivo(v === "todos" ? "" : v)}>
            <SelectTrigger className="w-auto min-w-36"><SelectValue placeholder="Motivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Motivo: Todos</SelectItem>
              {MOTIVOS_DEVOLUCION.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs whitespace-nowrap text-muted-foreground">Desde</Label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-auto" />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs whitespace-nowrap text-muted-foreground">Hasta</Label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-auto" />
          </div>
          {hayFiltrosActivos && (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={limpiarFiltrosDev}>
              <CloseCircle className="size-3.5" /> Limpiar
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{itemsFiltrados.length} de {items.length}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        {cargando ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No hay devoluciones registradas." : "Ninguna devolución coincide con los filtros."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Cuenta destino</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsFiltrados.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">#{d.id}</TableCell>
                  <TableCell className="text-xs">{new Date(d.fecha_registro).toLocaleDateString("es-ES")}</TableCell>
                  <TableCell className="text-sm">{d.nombre_cliente || "-"}</TableCell>
                  <TableCell className="font-medium">{d.importe ? `${Number(d.importe).toFixed(2)} €` : "-"}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm" title={d.motivo_detalle || ""}>{d.motivo || "-"}</TableCell>
                  <TableCell className="text-xs">{d.numero_cuenta || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={d.estado === "Completada" ? "default" : "secondary"}>{d.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {d.estado !== "Completada" ? (
                        <>
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditando(d)} title="Editar">
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setCompletando(d)}>
                            <TickCircle className="size-3.5" /> Completar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setDetalleAbierto(d)} title="Ver detalle">
                            <Eye className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setARevertir(d)}>
                            <RotateLeft className="size-3.5" /> Revertir
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <NuevaDevolucionDialog open={nuevaAbierta} onOpenChange={setNuevaAbierta} onCreada={cargar} />
      <NuevaDevolucionDialog
        open={editando !== null}
        onOpenChange={(o) => !o && setEditando(null)}
        onCreada={cargar}
        devolucionExistente={editando}
      />
      <CompletarDevolucionDialog devolucion={completando} onOpenChange={(o) => !o && setCompletando(null)} onCompletada={cargar} />
      <DetalleDevolucionDialog devolucion={detalleAbierto} onOpenChange={(o) => !o && setDetalleAbierto(null)} />
      <ConfirmarDialog
        open={aRevertir !== null}
        onOpenChange={(o) => !o && setARevertir(null)}
        titulo="Revertir devolución"
        detalles={aRevertir ? [
          { label: "Cliente", value: aRevertir.nombre_cliente || "-" },
          { label: "Importe", value: aRevertir.importe ? `${Number(aRevertir.importe).toFixed(2)} €` : "-" },
        ] : []}
        pregunta="Se borrarán la fecha de cierre, el comprobante de pago y quién la completó. ¿Devolver a Pendiente?"
        textoConfirmar="Revertir"
        onConfirmar={confirmarRevertir}
        confirmando={revirtiendo}
      />
    </div>
  );
}
