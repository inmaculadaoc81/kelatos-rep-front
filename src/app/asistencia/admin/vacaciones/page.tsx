"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Vacacion {
  id: number;
  empleado: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  motivo: string;
  state: string;
}

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ESTILO: Record<string, string> = { pendiente: "text-amber-600", aprobado: "text-emerald-600", rechazado: "text-destructive" };

export default function AdminVacacionesPage() {
  const [items, setItems] = useState<Vacacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/asistencia/admin/vacaciones");
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function resolver(id: number, accion: "aprobar" | "rechazar") {
    setProcesando(id);
    try {
      const res = await fetch(`/api/asistencia/admin/vacaciones/${id}/${accion}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(accion === "aprobar" ? "Aprobada" : "Rechazada");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Vacaciones</h1>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && items.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sin solicitudes</TableCell></TableRow>}
            {!cargando && items.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.empleado}</TableCell>
                <TableCell className="text-sm">{fecha(v.fecha_inicio)}</TableCell>
                <TableCell className="text-sm">{fecha(v.fecha_fin)}</TableCell>
                <TableCell className="text-sm">{v.dias_totales}</TableCell>
                <TableCell className="max-w-48 truncate text-sm" title={v.motivo}>{v.motivo}</TableCell>
                <TableCell className={`text-sm font-medium ${ESTILO[v.state] || ""}`}>{v.state}</TableCell>
                <TableCell>
                  {v.state === "pendiente" && (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 bg-emerald-600 text-white hover:bg-emerald-700" disabled={procesando === v.id} onClick={() => resolver(v.id, "aprobar")}>Aprobar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-destructive" disabled={procesando === v.id} onClick={() => resolver(v.id, "rechazar")}>Rechazar</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
