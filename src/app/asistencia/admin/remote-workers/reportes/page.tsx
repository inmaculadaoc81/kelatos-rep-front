"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Danger, Calendar, ClipboardText, Chart, Clock, Category2 } from "@/lib/icons";
import { EstadoActividadPill } from "../../../pills";
import {
  type RemoteWorkerListItem,
  type ReporteDiario,
  type ReporteSemanal,
  type AnalyticsSupervisor,
  type TimelineSegmento,
  type RemoteWorkerAppUsage,
  type AlertaDispositivo,
  mapearRemoteWorkerListItem,
  mapearReporteDiario,
  mapearReporteSemanal,
  mapearAnalytics,
  mapearTimelineSegmento,
  mapearAppUsage,
  mapearAlertaDispositivo,
  formatDuracion,
  TIPO_ALERTA_COLOR,
} from "@/lib/remote-workers";
import { AppDistributionChart } from "../app-distribution-chart";

function hoyStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

function lunesDeEstaSemana(): string {
  const hoy = new Date();
  const dow = hoy.getDay(); // 0=domingo..6=sábado
  const diffALunes = dow === 0 ? -6 : 1 - dow;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffALunes);
  return lunes.toLocaleDateString("en-CA");
}

const ESTILO_SEGMENTO: Record<TimelineSegmento["estado"], { bg: string; label: string }> = {
  WORKING: { bg: "#10b981", label: "Trabajando" },
  BREAK: { bg: "#3b82f6", label: "Descanso" },
  OUT_OF_SCHEDULE: { bg: "#f59e0b", label: "Fuera de horario" },
};

function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/** Bloque compacto de "métrica" — mismo patrón visual en todo el módulo
    (label pequeño arriba, valor grande abajo). */
function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{valor}</p>
    </div>
  );
}

function pct(v: number | null): string {
  return v == null ? "—" : `${v}%`;
}

/**
 * Reportes laborales y analítica (Fase 9.5) — no es una sección
 * independiente: vive dentro de Remote Work, reutiliza el selector de
 * empleado (misma lista que Dispositivos/Dashboard), los pills de
 * EstadoActividad, el pie chart de aplicaciones y el criterio de
 * productividad ya validado (calendario + fichajes, actividad fuera de
 * horario nunca cuenta como productividad laboral).
 */
export default function ReportesRemoteWorkersPage() {
  const [dispositivos, setDispositivos] = useState<RemoteWorkerListItem[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(true);
  const [empleadoId, setEmpleadoId] = useState<string>("");
  const [fecha, setFecha] = useState(hoyStr());
  const [fechaInicioSemana, setFechaInicioSemana] = useState(lunesDeEstaSemana());

  const empleados = useMemo(
    () => dispositivos.filter((d) => d.employeeId != null),
    [dispositivos],
  );

  useEffect(() => {
    fetch("/api/asistencia/admin/remote-workers")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const lista = (d.dispositivos as Record<string, unknown>[]).map(mapearRemoteWorkerListItem);
          setDispositivos(lista);
          const primero = lista.find((x) => x.employeeId != null);
          if (primero) setEmpleadoId(String(primero.employeeId));
        }
      })
      .finally(() => setCargandoEmpleados(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Reportes</h1>
        <p className="text-xs text-muted-foreground">Tiempo laboral, descansos y productividad por empleado — calculados sobre su horario real, no solo sobre actividad de PC.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="min-w-48 space-y-1">
            <Label>Empleado</Label>
            {cargandoEmpleados ? (
              <Skeleton className="h-9 w-full" />
            ) : empleados.length === 0 ? (
              <p className="pt-2 text-xs text-muted-foreground">Ningún dispositivo asignado todavía.</p>
            ) : (
              <Select value={empleadoId} onValueChange={(v) => setEmpleadoId(v || "")}>
                <SelectTrigger><SelectValue placeholder="Selecciona un empleado" /></SelectTrigger>
                <SelectContent>
                  {empleados.map((e) => (
                    <SelectItem key={e.employeeId} value={String(e.employeeId)}>{e.empleadoNombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <Label>Fecha (diario / timeline / apps)</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Semana desde (lunes)</Label>
            <Input type="date" value={fechaInicioSemana} onChange={(e) => setFechaInicioSemana(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {!empleadoId ? (
        <p className="text-sm text-muted-foreground">Selecciona un empleado para ver sus reportes.</p>
      ) : (
        <Tabs defaultValue="diario">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="diario" className="gap-1.5"><Calendar className="size-3.5" /> Diario</TabsTrigger>
            <TabsTrigger value="semanal" className="gap-1.5"><ClipboardText className="size-3.5" /> Semanal</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><Chart className="size-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="alertas" className="gap-1.5"><Danger className="size-3.5" /> Alertas</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5"><Clock className="size-3.5" /> Línea de tiempo</TabsTrigger>
            <TabsTrigger value="apps" className="gap-1.5"><Category2 className="size-3.5" /> Aplicaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="diario">
            <ReporteDiarioTab empleadoId={empleadoId} fecha={fecha} />
          </TabsContent>
          <TabsContent value="semanal">
            <ReporteSemanalTab empleadoId={empleadoId} fechaInicio={fechaInicioSemana} />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
          <TabsContent value="alertas">
            <AlertasTab />
          </TabsContent>
          <TabsContent value="timeline">
            <TimelineTab empleadoId={empleadoId} fecha={fecha} />
          </TabsContent>
          <TabsContent value="apps">
            <AplicacionesTab empleadoId={empleadoId} fecha={fecha} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ReporteDiarioTab({ empleadoId, fecha }: { empleadoId: string; fecha: string }) {
  const [reporte, setReporte] = useState<ReporteDiario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    setError(null);
    fetch(`/api/asistencia/admin/remote-workers/reports/daily?employeeId=${empleadoId}&fecha=${fecha}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReporte(mapearReporteDiario(d.reporte));
        else setError(d.error || "No se pudo cargar el reporte");
      })
      .finally(() => setCargando(false));
  }, [empleadoId, fecha]);

  if (cargando) return <Skeleton className="mt-3 h-40 w-full" />;
  if (error || !reporte) return <p className="mt-3 text-sm text-muted-foreground">{error || "Sin datos"}</p>;

  return (
    <Card className="mt-3">
      <CardContent className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">Horario: {reporte.horarioLabel || "Sin calendario asignado"}</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metrica label="Tiempo programado" valor={reporte.tiempoLaboralEsperadoSeg != null ? formatDuracion(reporte.tiempoLaboralEsperadoSeg) : "—"} />
          <Metrica label="Activo (en horario)" valor={formatDuracion(reporte.activoLaboralSeg)} />
          <Metrica label="Inactivo (en horario)" valor={formatDuracion(reporte.inactivoLaboralSeg)} />
          <Metrica label="Productividad" valor={pct(reporte.productividad)} />
          <Metrica label="Descanso" valor={reporte.descansoSeg > 0 ? formatDuracion(reporte.descansoSeg) : "—"} />
          <Metrica label="Fuera de horario" valor={reporte.fueraHorarioSeg > 0 ? formatDuracion(reporte.fueraHorarioSeg) : "—"} />
          <Metrica label="Equipo" valor={reporte.dispositivo?.hostname || "Sin dispositivo"} />
        </div>
        {reporte.fueraHorarioSeg > 0 && (
          <p className="text-xs text-muted-foreground">La actividad fuera de horario nunca cuenta como productividad laboral, aunque haya actividad detectada en el PC.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ReporteSemanalTab({ empleadoId, fechaInicio }: { empleadoId: string; fechaInicio: string }) {
  const [reporte, setReporte] = useState<ReporteSemanal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    setError(null);
    fetch(`/api/asistencia/admin/remote-workers/reports/weekly?employeeId=${empleadoId}&fechaInicio=${fechaInicio}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReporte(mapearReporteSemanal(d.reporte));
        else setError(d.error || "No se pudo cargar el reporte");
      })
      .finally(() => setCargando(false));
  }, [empleadoId, fechaInicio]);

  if (cargando) return <Skeleton className="mt-3 h-64 w-full" />;
  if (error || !reporte) return <p className="mt-3 text-sm text-muted-foreground">{error || "Sin datos"}</p>;

  return (
    <div className="mt-3 space-y-3">
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-5">
          <Metrica label="Días trabajados" valor={String(reporte.totales.diasTrabajados)} />
          <Metrica label="Activo laboral" valor={formatDuracion(reporte.totales.activoLaboralSeg)} />
          <Metrica label="Descanso" valor={formatDuracion(reporte.totales.descansoSeg)} />
          <Metrica label="Fuera de horario" valor={formatDuracion(reporte.totales.fueraHorarioSeg)} />
          <Metrica label="Productividad semanal" valor={pct(reporte.totales.productividad)} />
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Día</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Descanso</TableHead>
              <TableHead>Fuera de horario</TableHead>
              <TableHead>Productividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reporte.dias.map((d) => (
              <TableRow key={d.fecha}>
                <TableCell className="font-medium">{new Date(d.fecha).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "2-digit" })}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.horarioLabel || "—"}</TableCell>
                <TableCell className="text-sm">{formatDuracion(d.activoLaboralSeg)}</TableCell>
                <TableCell className="text-sm">{d.descansoSeg > 0 ? formatDuracion(d.descansoSeg) : "—"}</TableCell>
                <TableCell className="text-sm">{d.fueraHorarioSeg > 0 ? formatDuracion(d.fueraHorarioSeg) : "—"}</TableCell>
                <TableCell className="text-sm">{pct(d.productividad)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<AnalyticsSupervisor | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/asistencia/admin/remote-workers/analytics")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setAnalytics(mapearAnalytics(d.analytics)); })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <Skeleton className="mt-3 h-64 w-full" />;
  if (!analytics) return <p className="mt-3 text-sm text-muted-foreground">Sin datos</p>;

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card><CardContent className="pt-4"><Metrica label="Trabajadores activos hoy" valor={String(analytics.trabajadoresActivosHoy)} /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metrica label="Productividad promedio" valor={pct(analytics.productividadPromedio)} /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metrica label="Tiempo activo promedio" valor={formatDuracion(analytics.tiempoActivoPromedioSeg)} /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metrica label="Horas fuera de horario" valor={formatDuracion(analytics.horasFueraHorarioSeg)} /></CardContent></Card>
        <Card><CardContent className="pt-4"><Metrica label="Descansos registrados hoy" valor={String(analytics.descansosRegistrados)} /></CardContent></Card>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado actual</TableHead>
              <TableHead>Activo hoy</TableHead>
              <TableHead>Productividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.tabla.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Sin dispositivos asignados</TableCell></TableRow>
            )}
            {analytics.tabla.map((d) => (
              <TableRow key={d.deviceId}>
                <TableCell className="font-medium">{d.empleadoNombre || "Sin asignar"}</TableCell>
                <TableCell className="text-sm">{d.hostname}</TableCell>
                <TableCell><EstadoActividadPill estado={d.estadoActividad} /></TableCell>
                <TableCell className="text-sm">{formatDuracion(d.activeSecondsHoy)}</TableCell>
                <TableCell className="text-sm">{pct(d.productividadHorario)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AlertaPill({ mensaje, tipo }: { mensaje: string; tipo: AlertaDispositivo["alertas"][number]["tipo"] }) {
  const estilo = TIPO_ALERTA_COLOR[tipo];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: estilo.bg, color: estilo.color }}>
      <Danger className="size-3" /> {mensaje}
    </span>
  );
}

function AlertasTab() {
  const [alertas, setAlertas] = useState<AlertaDispositivo[] | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/asistencia/admin/remote-workers/alertas")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setAlertas((d.alertas as Record<string, unknown>[]).map(mapearAlertaDispositivo)); })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <Skeleton className="mt-3 h-48 w-full" />;
  if (!alertas || alertas.length === 0) {
    return (
      <Card className="mt-3">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sin alertas activas — ningún equipo lleva &gt;30 min sin conexión, &gt;2h fuera de horario ni &gt;2h sin actividad en jornada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {alertas.map((d) => (
        <Card key={d.deviceId}>
          <CardContent className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{d.empleadoNombre || "Sin asignar"}</p>
              <p className="text-xs text-muted-foreground">{d.hostname}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {d.alertas.map((a, i) => <AlertaPill key={i} mensaje={a.mensaje} tipo={a.tipo} />)}
            </div>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {d.alertas.map((a, i) => <li key={i}>{a.detalle}</li>)}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TimelineTab({ empleadoId, fecha }: { empleadoId: string; fecha: string }) {
  const [segmentos, setSegmentos] = useState<TimelineSegmento[] | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    fetch(`/api/asistencia/admin/remote-workers/reports/timeline?employeeId=${empleadoId}&fecha=${fecha}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSegmentos((d.segmentos as Record<string, unknown>[]).map(mapearTimelineSegmento)); })
      .finally(() => setCargando(false));
  }, [empleadoId, fecha]);

  if (cargando) return <Skeleton className="mt-3 h-48 w-full" />;
  if (!segmentos || segmentos.length === 0) return <p className="mt-3 text-sm text-muted-foreground">Sin franjas de horario ni actividad ese día.</p>;

  const inicio = new Date(segmentos[0].inicio).getTime();
  const fin = Math.max(...segmentos.map((s) => new Date(s.fin).getTime()));
  const total = Math.max(1, fin - inicio);

  return (
    <Card className="mt-3">
      <CardContent className="space-y-4 pt-4">
        <div className="flex h-8 w-full overflow-hidden rounded-md border">
          {segmentos.map((s, i) => {
            const ancho = ((new Date(s.fin).getTime() - new Date(s.inicio).getTime()) / total) * 100;
            return (
              <div
                key={i}
                title={`${ESTILO_SEGMENTO[s.estado].label}: ${horaCorta(s.inicio)}–${horaCorta(s.fin)} (${formatDuracion(s.duracionSeg)})`}
                style={{ width: `${ancho}%`, backgroundColor: ESTILO_SEGMENTO[s.estado].bg }}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {Object.entries(ESTILO_SEGMENTO).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: v.bg }} /> {v.label}
            </span>
          ))}
        </div>
        <ol className="space-y-0">
          {segmentos.map((s, i) => (
            <li key={i} className="flex items-center gap-3 border-l-2 border-border py-1.5 pl-3">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: ESTILO_SEGMENTO[s.estado].bg }} />
              <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">{horaCorta(s.inicio)}–{horaCorta(s.fin)}</span>
              <span className="flex-1 text-sm">{ESTILO_SEGMENTO[s.estado].label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDuracion(s.duracionSeg)}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function AplicacionesTab({ empleadoId, fecha }: { empleadoId: string; fecha: string }) {
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [apps, setApps] = useState<RemoteWorkerAppUsage[] | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    fetch(`/api/asistencia/admin/remote-workers/reports/daily?employeeId=${empleadoId}&fecha=${fecha}`)
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.ok || !d.reporte.dispositivo) { setDeviceId(null); setApps([]); return; }
        setDeviceId(d.reporte.dispositivo.deviceId);
        const rApps = await fetch(`/api/asistencia/admin/remote-workers/${d.reporte.dispositivo.deviceId}/applications?fecha=${fecha}`).then((r) => r.json());
        setApps(rApps.ok ? (rApps.aplicaciones as Record<string, unknown>[]).map(mapearAppUsage) : []);
      })
      .finally(() => setCargando(false));
  }, [empleadoId, fecha]);

  if (cargando) return <Skeleton className="mt-3 h-64 w-full" />;
  if (!deviceId) return <p className="mt-3 text-sm text-muted-foreground">Sin dispositivo asignado ese día.</p>;

  return (
    <Card className="mt-3">
      <CardContent className="pt-4">
        <AppDistributionChart apps={apps || []} />
      </CardContent>
    </Card>
  );
}
