"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DocumentText, Refresh2, DocumentDownload } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PresupuestoEnviado } from "@/lib/presupuestos-enviados";

function fechaHoraCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16).replace("T", " ");
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function euros(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/** Reproduce #vistaPresupuestos (cargarPresupuestosEnviados) del original — solo lectura, sin filtros ni acciones propias. */
export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<PresupuestoEnviado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/presupuestos");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error al cargar presupuestos");
      setPresupuestos(data.presupuestos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DocumentText className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">Presupuestos Enviados</h1>
        <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={cargar} disabled={cargando}>
          <Refresh2 className={`size-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Fecha / Hora</TableHead>
              <TableHead className="w-32">N.º Presupuesto</TableHead>
              <TableHead className="w-28">Resguardo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="w-28 text-right">Total + IVA</TableHead>
              <TableHead className="w-16 text-center">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : presupuestos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No hay presupuestos enviados.
                </TableCell>
              </TableRow>
            ) : (
              presupuestos.map((p) => (
                <TableRow key={p.presupuestoId}>
                  <TableCell className="text-sm text-muted-foreground">{fechaHoraCorta(p.fechaEnvio)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">{p.numeroPresupuesto || "—"}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{p.resguardo}</TableCell>
                  <TableCell className="text-sm">{p.clienteNombre || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.equipo || "—"}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{euros(p.total * 1.21)}</TableCell>
                  <TableCell className="text-center">
                    {p.urlPdf ? (
                      <Button size="icon-sm" variant="ghost" className="text-destructive" nativeButton={false} render={<Link href={p.urlPdf} target="_blank" rel="noreferrer" />}>
                        <DocumentDownload className="size-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
