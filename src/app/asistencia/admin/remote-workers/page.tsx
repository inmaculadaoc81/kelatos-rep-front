"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Monitor, Profile2User, Chart } from "@/lib/icons";
import { EstadoActividadPill } from "../../pills";
import {
  type RemoteWorkerListItem,
  type RemoteWorkersDashboard,
  mapearRemoteWorkerListItem,
  mapearDashboard,
  formatDuracion,
  calcularProductividad,
} from "@/lib/remote-workers";

function hace(fecha: string | null): string {
  if (!fecha) return "Nunca";
  const ms = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Ahora mismo";
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  return `Hace ${Math.floor(horas / 24)} d`;
}

/** Dashboard de "Teletrabajadores remotos" (Asistencia) — solo monitoreo
    (cards + tabla de actividad/productividad). La gestión de dispositivos
    (asignar/cambiar empleado, desactivar) vive en su propia vista,
    "Dispositivos" — ver dispositivos/page.tsx. */
export default function RemoteWorkersPage() {
  const router = useRouter();
  const [dispositivos, setDispositivos] = useState<RemoteWorkerListItem[]>([]);
  const [resumen, setResumen] = useState<RemoteWorkersDashboard | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    try {
      const [rDisp, rDash] = await Promise.all([
        fetch("/api/asistencia/admin/remote-workers").then((r) => r.json()),
        fetch("/api/asistencia/admin/remote-workers/dashboard").then((r) => r.json()),
      ]);
      if (rDisp.ok) setDispositivos((rDisp.dispositivos as Record<string, unknown>[]).map(mapearRemoteWorkerListItem));
      if (rDash.ok) setResumen(mapearDashboard(rDash.resumen));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Remote Workers</h1>
        <p className="text-xs text-muted-foreground">Actividad de PC de empleados en teletrabajo — sincronizada automáticamente, no se registra nada manual aquí.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Profile2User className="size-5 text-emerald-600" />
            <div>
              <p className="text-lg font-semibold leading-none">{cargando ? "—" : resumen?.conectados ?? 0}</p>
              <p className="text-xs text-muted-foreground">Trabajadores conectados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Monitor className="size-5 text-sky-600" />
            <div>
              <p className="text-lg font-semibold leading-none">{cargando ? "—" : resumen?.totalDispositivos ?? 0}</p>
              <p className="text-xs text-muted-foreground">Dispositivos registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Chart className="size-5 text-violet-600" />
            <div>
              <p className="text-lg font-semibold leading-none">{cargando ? "—" : resumen?.sesionesHoy ?? 0}</p>
              <p className="text-xs text-muted-foreground">Sesiones del día</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Chart className="size-5 text-amber-600" />
            <div>
              <p className="text-lg font-semibold leading-none">{cargando || resumen?.productividadPromedio == null ? "—" : `${resumen.productividadPromedio}%`}</p>
              <p className="text-xs text-muted-foreground">Productividad promedio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado actual</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Activo hoy</TableHead>
              <TableHead>Descanso</TableHead>
              <TableHead>Productividad</TableHead>
              <TableHead>Última actividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {!cargando && dispositivos.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Todavía no ha sincronizado ningún dispositivo.</TableCell></TableRow>
            )}
            {!cargando && dispositivos.map((d) => {
              // Productividad por horario si tiene calendario asignado;
              // si no, cae a la técnica (activo/(activo+inactivo)) —
              // mismo criterio que en el detalle del dispositivo.
              const productividad = d.productividadHorario ?? calcularProductividad(d.activeSecondsHoy, d.idleSecondsHoy);
              return (
                <TableRow
                  key={d.deviceId}
                  className="cursor-pointer"
                  onClick={() => router.push(`/asistencia/admin/remote-workers/${d.deviceId}`)}
                >
                  <TableCell className="font-medium">
                    {d.empleadoNombre || <span className="text-muted-foreground">Sin asignar</span>}
                  </TableCell>
                  <TableCell className="text-sm">{d.hostname}</TableCell>
                  <TableCell><EstadoActividadPill estado={d.estadoActividad} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.horarioLabel || "—"}</TableCell>
                  <TableCell className="text-sm">{formatDuracion(d.activeSecondsHoy)}</TableCell>
                  <TableCell className="text-sm">{d.descansoSegHoy > 0 ? formatDuracion(d.descansoSegHoy) : "—"}</TableCell>
                  <TableCell className="text-sm">{productividad == null ? "—" : `${productividad}%`}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{hace(d.lastSeen)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
