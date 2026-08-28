"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Evento {
  id: number;
  fecha: string;
  usuario: string;
  empleado: string;
  fichaje_id: number;
  campo: string;
  valor_anterior: string;
  valor_nuevo: string;
}

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAuditoriaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/asistencia/admin/auditoria")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setEventos(d.eventos); })
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Auditoría</h1>
        <p className="text-xs text-muted-foreground">Cada cambio manual sobre un fichaje ya registrado queda aquí — solo lectura.</p>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Fichaje</TableHead>
              <TableHead>Campo</TableHead>
              <TableHead>Antes</TableHead>
              <TableHead>Después</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && eventos.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sin eventos registrados</TableCell></TableRow>}
            {!cargando && eventos.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm">{fechaHora(e.fecha)}</TableCell>
                <TableCell className="text-sm">{e.usuario}</TableCell>
                <TableCell className="text-sm">{e.empleado}</TableCell>
                <TableCell className="text-sm">#{e.fichaje_id}</TableCell>
                <TableCell className="text-sm">{e.campo}</TableCell>
                <TableCell className="max-w-32 truncate text-xs text-muted-foreground" title={e.valor_anterior}>{e.valor_anterior || "-"}</TableCell>
                <TableCell className="max-w-32 truncate text-xs" title={e.valor_nuevo}>{e.valor_nuevo || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
