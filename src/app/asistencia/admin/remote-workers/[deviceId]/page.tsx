"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft2 } from "@/lib/icons";
import { EstadoDispositivoPill } from "../../../pills";
import {
  type RemoteWorkerDetail,
  type RemoteWorkerHistoryRow,
  type EstadoDispositivo,
  mapearDetalle,
  mapearHistorialRow,
  formatDuracion,
  calcularProductividad,
} from "@/lib/remote-workers";
import { AppDistributionChart } from "../app-distribution-chart";
import { ProductividadHistoryChart } from "../productividad-history-chart";
import { Timeline } from "../timeline";

function fechaHora(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Detalle de un dispositivo remoto: info, resumen del día, distribución
    de apps, timeline y histórico. Vista de solo lectura para managers. */
export default function RemoteWorkerDetailPage() {
  const params = useParams<{ deviceId: string }>();
  const router = useRouter();
  const [detalle, setDetalle] = useState<RemoteWorkerDetail | null>(null);
  const [historial, setHistorial] = useState<RemoteWorkerHistoryRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const [rDet, rHist] = await Promise.all([
          fetch(`/api/asistencia/admin/remote-workers/${params.deviceId}`).then((r) => r.json()),
          fetch(`/api/asistencia/admin/remote-workers/${params.deviceId}/activity`).then((r) => r.json()),
        ]);
        if (rDet.ok) setDetalle(mapearDetalle(rDet));
        else setError(rDet.error || "No se pudo cargar el dispositivo");
        if (rHist.ok) setHistorial((rHist.historial as Record<string, unknown>[]).map(mapearHistorialRow));
      } catch {
        setError("Error de red");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [params.deviceId]);

  if (cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error || !detalle) {
    return <p className="text-sm text-muted-foreground">{error || "Dispositivo no encontrado."}</p>;
  }

  const { device, hoy, applications, windowEvents } = detalle;
  const productividadHoy = calcularProductividad(hoy.activeSeconds, hoy.idleSeconds);

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft2 className="size-3" /> Remote Workers
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{device.empleadoNombre || "Sin asignar"}</h1>
          <p className="text-xs text-muted-foreground">{device.hostname}</p>
        </div>
        <EstadoDispositivoPill estado={device.status === "deshabilitado" ? "deshabilitado" as EstadoDispositivo : (windowEvents.length || applications.length ? "conectado" : "inactivo") as EstadoDispositivo} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <p className="font-medium text-muted-foreground">Información</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Usuario Windows</span><span>{device.username}</span>
              <span className="text-muted-foreground">Hostname</span><span>{device.hostname}</span>
              <span className="text-muted-foreground">Device ID</span><span className="truncate">{device.deviceUuid}</span>
              <span className="text-muted-foreground">Última conexión</span><span>{fechaHora(device.lastSeen)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <p className="font-medium text-muted-foreground">Resumen de hoy</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Tiempo trabajado</span><span>{formatDuracion(hoy.activeSeconds + hoy.idleSeconds)}</span>
              <span className="text-muted-foreground">Tiempo activo</span><span>{formatDuracion(hoy.activeSeconds)}</span>
              <span className="text-muted-foreground">Tiempo inactivo</span><span>{formatDuracion(hoy.idleSeconds)}</span>
              <span className="text-muted-foreground">Productividad</span><span>{productividadHoy == null ? "—" : `${productividadHoy}%`}</span>
              <span className="text-muted-foreground">Primera actividad</span><span>{fechaHora(hoy.primeraActividad)}</span>
              <span className="text-muted-foreground">Última actividad</span><span>{fechaHora(hoy.ultimaActividad)}</span>
              <span className="text-muted-foreground">Nº de aplicaciones</span><span>{applications.length}</span>
              <span className="text-muted-foreground">Nº de eventos</span><span>{windowEvents.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Distribución de aplicaciones (hoy)</p>
            <AppDistributionChart apps={applications} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Actividad de hoy</p>
            <div className="max-h-56 overflow-y-auto">
              <Timeline eventos={windowEvents} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Productividad — últimos días</p>
          <ProductividadHistoryChart filas={historial} />
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Día</TableHead>
              <TableHead>Horas activas</TableHead>
              <TableHead>Horas inactivas</TableHead>
              <TableHead>Productividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historial.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Sin histórico todavía</TableCell></TableRow>
            )}
            {historial.map((f) => (
              <TableRow key={f.dia}>
                <TableCell>{new Date(f.dia).toLocaleDateString("es-ES")}</TableCell>
                <TableCell>{formatDuracion(f.activeSeconds)}</TableCell>
                <TableCell>{formatDuracion(f.idleSeconds)}</TableCell>
                <TableCell>{f.productividad == null ? "—" : `${f.productividad}%`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!device.employeeId && (
        <p className="text-xs text-muted-foreground">
          Este dispositivo no está vinculado a ningún empleado — asígnalo desde{" "}
          <Link href="/asistencia/admin/remote-workers" className="underline">Remote Workers</Link>.
        </p>
      )}
    </div>
  );
}
