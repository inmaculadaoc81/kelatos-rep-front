"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Empleado {
  id: number;
  nombre: string;
}
interface Fichaje {
  id: number;
  employee_id: number;
  empleado_nombre: string;
  check_in: string;
  check_out: string | null;
  tipo_fichaje: string;
  firmado: boolean;
  ip_registro: string | null;
  observaciones: string | null;
}

function fechaHora(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminFichajesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      const qs = empleadoId ? `?employeeId=${empleadoId}` : "";
      const res = await fetch(`/api/asistencia/admin/fichajes${qs}`);
      const data = await res.json();
      if (data.ok) setFichajes(data.fichajes);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    fetch("/api/asistencia/admin/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados); });
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Fichajes</h1>
        <div className="flex items-center gap-2">
          <Select value={empleadoId || "__todos"} onValueChange={(v) => setEmpleadoId(!v || v === "__todos" ? "" : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todos los empleados" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos">Todos los empleados</SelectItem>
              {empleados.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={cargar}>Actualizar</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Firmado</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && fichajes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin fichajes</TableCell></TableRow>
            )}
            {!cargando && fichajes.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.empleado_nombre}</TableCell>
                <TableCell className="text-sm">{fechaHora(f.check_in)}</TableCell>
                <TableCell className="text-sm">{fechaHora(f.check_out)}</TableCell>
                <TableCell className="text-sm">{f.tipo_fichaje}</TableCell>
                <TableCell className="text-sm">{f.firmado ? "✍️" : "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.ip_registro || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
