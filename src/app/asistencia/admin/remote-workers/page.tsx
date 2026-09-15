"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, Profile2User, Chart, Danger, Clock, Edit2 } from "@/lib/icons";
import { EstadoActividadPill } from "../../pills";
import { AppIcon } from "./app-icon";
import {
  type RemoteWorkerListItem,
  type RemoteWorkersDashboard,
  type AlertaDispositivo,
  mapearRemoteWorkerListItem,
  mapearDashboard,
  mapearAlertaDispositivo,
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
  const [alertas, setAlertas] = useState<AlertaDispositivo[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    try {
      const [rDisp, rDash, rAlert] = await Promise.all([
        fetch("/api/asistencia/admin/remote-workers").then((r) => r.json()),
        fetch("/api/asistencia/admin/remote-workers/dashboard").then((r) => r.json()),
        fetch("/api/asistencia/admin/remote-workers/alertas").then((r) => r.json()),
      ]);
      if (rDisp.ok) setDispositivos((rDisp.dispositivos as Record<string, unknown>[]).map(mapearRemoteWorkerListItem));
      if (rDash.ok) setResumen(mapearDashboard(rDash.resumen));
      if (rAlert.ok) setAlertas((rAlert.alertas as Record<string, unknown>[]).map(mapearAlertaDispositivo));
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
        <Link href="/asistencia/admin/remote-workers/reportes">
          <Card className={alertas.length > 0 ? "border-destructive/50" : undefined}>
            <CardContent className="flex items-center gap-3 pt-4">
              <Danger className={`size-5 ${alertas.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <p className="text-lg font-semibold leading-none">{cargando ? "—" : alertas.length}</p>
                <p className="text-xs text-muted-foreground">Alertas activas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tarjeta por empleado en vez de tabla ancha: lo importante (estado,
          actividad de hoy, resumen escrito) se ve entero de un vistazo, sin
          celdas cortadas que obligan a pasar el ratón para leer nada.
          Petición del usuario, 2026-09-16: "que en dashboard se vea
          información útil más resumida [...] tiene que salir los
          resúmenes de cada empleado ese día (actividad) y también el
          mensaje de su resumen escrito". */}
      {cargando && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      )}

      {!cargando && dispositivos.length === 0 && (
        <div className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">
          Todavía no ha sincronizado ningún dispositivo.
        </div>
      )}

      {!cargando && dispositivos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dispositivos.map((d) => {
            // Productividad por horario si tiene calendario asignado; si
            // no, cae a la técnica (activo/(activo+inactivo)) — mismo
            // criterio que en el detalle del dispositivo.
            const productividad = d.productividadHorario ?? calcularProductividad(d.activeSecondsHoy, d.idleSecondsHoy);
            return (
              <Card
                key={d.deviceId}
                className="cursor-pointer transition-colors hover:border-primary/40"
                onClick={() => router.push(`/asistencia/admin/remote-workers/${d.deviceId}`)}
              >
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {d.empleadoNombre || <span className="text-muted-foreground">Sin asignar</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{d.hostname}</p>
                    </div>
                    <EstadoActividadPill estado={d.estadoActividad} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-2 text-center">
                    <div>
                      <p className="text-sm font-semibold">{formatDuracion(d.activeSecondsHoy)}</p>
                      <p className="text-[10px] text-muted-foreground">Activo hoy</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{productividad == null ? "—" : `${productividad}%`}</p>
                      <p className="text-[10px] text-muted-foreground">Productividad</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{d.descansoSegHoy > 0 ? formatDuracion(d.descansoSegHoy) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Descanso</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Clock className="size-3.5 shrink-0" /> {d.horarioLabel || "Sin horario asignado"}
                    </p>
                    <p>Última actividad: {hace(d.lastSeen)}</p>
                    {d.appPrincipal && (
                      <p className="flex items-center gap-1.5">
                        <AppIcon applicationName={d.appPrincipal} className="size-3.5 shrink-0" /> App principal: {d.appPrincipal}
                      </p>
                    )}
                  </div>

                  {/* Lo que el empleado escribió al fichar la salida —
                      siempre visible (no truncado a una línea), con un
                      estado neutro cuando todavía no ha fichado. */}
                  <div className="rounded-md border bg-muted/20 p-2">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      <Edit2 className="size-3" /> Resumen del día
                    </p>
                    <p className={`text-xs ${d.resumenDia ? "" : "text-muted-foreground italic"}`}>
                      {d.resumenDia || "Sin resumen todavía"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
