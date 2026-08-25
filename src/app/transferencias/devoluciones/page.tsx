"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, AddCircle, TickCircle, RotateLeft, Refresh2, Clock, Money, ArrowRotateLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "../stat-card";
import { ConfirmarDialog } from "../confirmar-dialog";
import { NuevaDevolucionDialog } from "./nueva-devolucion-dialog";
import { CompletarDevolucionDialog } from "./completar-devolucion-dialog";

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
}

/** Módulo de Devoluciones (reembolsos a clientes) — puerto del módulo de "Transferencias-2". */
export default function DevolucionesPage() {
  const [items, setItems] = useState<Devolucion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState({ pendientes: 0, completadas: 0, importePendiente: 0, importeDevuelto: 0 });
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [completando, setCompletando] = useState<Devolucion | null>(null);

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

      <div className="overflow-x-auto rounded-xl border bg-card">
        {cargando ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No hay devoluciones registradas.</p>
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
              {items.map((d) => (
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
                    {d.estado !== "Completada" ? (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setCompletando(d)}>
                        <TickCircle className="size-3.5" /> Completar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setARevertir(d)}>
                        <RotateLeft className="size-3.5" /> Revertir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <NuevaDevolucionDialog open={nuevaAbierta} onOpenChange={setNuevaAbierta} onCreada={cargar} />
      <CompletarDevolucionDialog devolucion={completando} onOpenChange={(o) => !o && setCompletando(null)} onCompletada={cargar} />
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
