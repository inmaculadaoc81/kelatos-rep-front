"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Marcacion {
  id: number;
  empleado: string;
  fecha_marcacion: string;
  tipo_fichaje: string;
  hora_solicitada: string;
  motivo: string;
  state: string;
}

const TIPO_LABEL: Record<string, string> = { entrada: "Entrada", salida_comida: "Salida comida", vuelta_comida: "Vuelta comida", salida: "Salida" };
const ESTILO: Record<string, string> = { pendiente: "text-amber-600", aprobado_auto: "text-emerald-600", aprobado_manual: "text-emerald-600", rechazado: "text-destructive" };

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function horaFmt(horaFloat: string) {
  const n = Number(horaFloat);
  const h = Math.trunc(n);
  const m = Math.round((n - h) * 100);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function AdminMarcacionesOlvidadasPage() {
  const [items, setItems] = useState<Marcacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/asistencia/admin/marcaciones-olvidadas");
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function resolver(id: number, accion: "aprobar-manual" | "aprobar-auto" | "rechazar") {
    setProcesando(id);
    try {
      const res = await fetch(`/api/asistencia/admin/marcaciones-olvidadas/${id}/${accion}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success(accion === "rechazar" ? "Rechazada" : "Aprobada");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Marcaciones olvidadas</h1>
        <p className="text-xs text-muted-foreground">
          &quot;Aprobar auto&quot; reconstruye el fichaje que falta automáticamente. &quot;Aprobar manual&quot; solo marca la solicitud como resuelta, sin tocar los fichajes.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Hora</TableHead>
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
            {!cargando && items.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.empleado}</TableCell>
                <TableCell className="text-sm">{fecha(m.fecha_marcacion)}</TableCell>
                <TableCell className="text-sm">{TIPO_LABEL[m.tipo_fichaje] || m.tipo_fichaje}</TableCell>
                <TableCell className="text-sm">{horaFmt(m.hora_solicitada)}</TableCell>
                <TableCell className="max-w-40 truncate text-sm" title={m.motivo}>{m.motivo}</TableCell>
                <TableCell className={`text-sm font-medium ${ESTILO[m.state] || ""}`}>{m.state}</TableCell>
                <TableCell>
                  {m.state === "pendiente" && (
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" className="h-7 bg-emerald-600 text-white hover:bg-emerald-700" disabled={procesando === m.id} onClick={() => resolver(m.id, "aprobar-auto")}>Aprobar auto</Button>
                      <Button size="sm" variant="outline" className="h-7" disabled={procesando === m.id} onClick={() => resolver(m.id, "aprobar-manual")}>Aprobar manual</Button>
                      <Button size="sm" variant="outline" className="h-7 text-destructive" disabled={procesando === m.id} onClick={() => resolver(m.id, "rechazar")}>Rechazar</Button>
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
