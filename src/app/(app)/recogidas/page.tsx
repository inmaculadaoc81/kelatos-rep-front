"use client";

import { useEffect, useState } from "react";
import { Refresh2, Edit2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Recogida } from "@/lib/recogidas";
import { EditarRecogidaDialog } from "./editar-recogida-dialog";

const COLOR_ESTADO: Record<string, string> = {
  "Pedido de recogida": "bg-amber-500/10 text-amber-600",
  "Recogida Pagada": "bg-green-500/10 text-green-600",
  "Pago pendiente": "bg-red-500/10 text-red-600",
  "No contesta": "bg-slate-500/10 text-slate-600",
  "Recogida Realizada": "bg-blue-500/10 text-blue-600",
  "Recibido en local": "bg-cyan-500/10 text-cyan-600",
};

export default function RecogidasPage() {
  const [recogidas, setRecogidas] = useState<Recogida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Recogida | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/recogidas");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setRecogidas(data.recogidas as Recogida[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  const [sincronizando, setSincronizando] = useState(false);

  async function actualizar() {
    setSincronizando(true);
    try {
      const res = await fetch("/api/recogidas/sincronizar", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.nuevos > 0) toast.success(`${data.nuevos} recogida${data.nuevos !== 1 ? "s" : ""} nueva${data.nuevos !== 1 ? "s" : ""} desde Calendar`);
    } catch {
      // best-effort: si falla la sincronización, igualmente recargamos lo que ya hay en Postgres
    } finally {
      setSincronizando(false);
    }
    await cargar();
  }

  useEffect(() => {
    actualizar();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Recogidas a Domicilio</h1>
          <p className="text-sm text-muted-foreground">Recogidas registradas en Google Calendar</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={actualizar} disabled={sincronizando}>
          <Refresh2 className={`size-4 ${cargando || sincronizando ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar recogidas: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dirección</TableHead>
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

            {!cargando && recogidas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Sin recogidas registradas
                </TableCell>
              </TableRow>
            )}

            {!cargando &&
              recogidas.map((r) => (
                <TableRow key={r.idEvento}>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        r.tipo === "cita_tienda" ? "bg-violet-500/10 text-violet-600" : "bg-sky-500/10 text-sky-600"
                      }`}
                    >
                      {r.tipo === "cita_tienda" ? "Cita en tienda" : "Recogida"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{r.fecha ? new Date(r.fecha).toLocaleDateString("es-ES") : "-"}</TableCell>
                  <TableCell className="text-sm">{r.hora || "-"}</TableCell>
                  <TableCell className="text-sm">{r.cliente || "-"}</TableCell>
                  <TableCell className="max-w-32 truncate text-sm">{r.asunto || "-"}</TableCell>
                  <TableCell className="text-sm">{r.telefono || "-"}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm">{r.direccion || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[r.estado] || ""}`}>
                      {r.estado || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditando(r)}>
                      <Edit2 className="size-3.5" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Badge variant="outline" className="mt-3">
        {recogidas.length} recogidas
      </Badge>

      <EditarRecogidaDialog recogida={editando} open={editando !== null} onOpenChange={(o) => !o && setEditando(null)} onGuardado={cargar} />
    </div>
  );
}
