"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Correccion {
  id: number;
  empleado: string;
  tipo_campo: string;
  hora_original: string | null;
  hora_solicitada: string | null;
  motivo: string;
  state: string;
}

const CAMPO_LABEL: Record<string, string> = { check_in: "Entrada", check_out: "Salida" };
const ESTILO: Record<string, string> = { pendiente: "text-amber-600", aprobado: "text-emerald-600", rechazado: "text-destructive" };

function fechaHora(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminCorreccionesPage() {
  const [items, setItems] = useState<Correccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/asistencia/admin/correcciones");
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
      const res = await fetch(`/api/asistencia/admin/correcciones/${id}/${accion}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(accion === "aprobar" ? "Aprobada — el fichaje se actualizó" : "Rechazada");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Correcciones de fichaje</h1>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Campo</TableHead>
              <TableHead>Original</TableHead>
              <TableHead>Solicitada</TableHead>
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
            {!cargando && items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.empleado}</TableCell>
                <TableCell className="text-sm">{CAMPO_LABEL[c.tipo_campo] || c.tipo_campo}</TableCell>
                <TableCell className="text-sm">{fechaHora(c.hora_original)}</TableCell>
                <TableCell className="text-sm">{fechaHora(c.hora_solicitada)}</TableCell>
                <TableCell className="max-w-48 truncate text-sm" title={c.motivo}>{c.motivo}</TableCell>
                <TableCell className={`text-sm font-medium ${ESTILO[c.state] || ""}`}>{c.state}</TableCell>
                <TableCell>
                  {c.state === "pendiente" && (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 bg-emerald-600 text-white hover:bg-emerald-700" disabled={procesando === c.id} onClick={() => resolver(c.id, "aprobar")}>Aprobar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-destructive" disabled={procesando === c.id} onClick={() => resolver(c.id, "rechazar")}>Rechazar</Button>
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
