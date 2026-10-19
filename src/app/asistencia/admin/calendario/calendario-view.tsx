"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AMBITO_FERIADO_LABEL, PAIS_LABEL, TIPO_AUSENCIA_ESTILO, TIPO_AUSENCIA_LABEL, TIPO_AUSENCIA_LETRA,
  claveDia, diaSemanaLunes0, diasEnMes,
  type AusenciaCalendario, type FeriadoCalendario, type PaisCalendario, type RespuestaCalendario, type TipoAusencia,
} from "@/lib/ausencias-calendario";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const LETRA_DIA = ["L", "M", "X", "J", "V", "S", "D"];
const NOMBRE_DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const TIPOS: TipoAusencia[] = ["vacaciones", "dia_libre", "descanso_medico"];

function formatoFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function diaSemanaDeIso(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return diaSemanaLunes0(a, m - 1, d);
}

/**
 * Calendario de ausencias de Asistencia: una fila por empleado y una columna por día del mes, con las vacaciones,
 * los días libres y los descansos médicos coloreados, y los feriados del país (España = personal del local,
 * Perú = remotos) marcados en la cabecera. Debajo, la lista de feriados del año.
 */
export function CalendarioAusenciasView({ pais }: { pais: PaisCalendario }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes0, setMes0] = useState(hoy.getMonth());
  const [datos, setDatos] = useState<RespuestaCalendario | null>(null);
  const [feriadosAnio, setFeriadosAnio] = useState<FeriadoCalendario[]>([]);
  /** Clave (país|año|mes) de los datos cargados: mientras no coincida con la actual, se está cargando. */
  const [claveCargada, setClaveCargada] = useState("");
  /** Se incrementa para volver a pedir los datos tras guardar o anular algo. */
  const [recarga, setRecarga] = useState(0);

  const [nuevaAusencia, setNuevaAusencia] = useState<{ empleadoId: string; fecha: string } | null>(null);
  const [detalle, setDetalle] = useState<{ ausencia: AusenciaCalendario; empleado: string } | null>(null);
  const [nuevoFeriado, setNuevoFeriado] = useState(false);

  const nDias = diasEnMes(anio, mes0);
  const claveHoy = claveDia(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const claveActual = `${pais}|${anio}|${mes0}`;
  const cargando = claveCargada !== claveActual;
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const desde = claveDia(anio, mes0, 1);
        const hasta = claveDia(anio, mes0, diasEnMes(anio, mes0));
        const [rc, rf] = await Promise.all([
          fetch(`/api/asistencia/admin/calendario?desde=${desde}&hasta=${hasta}&pais=${pais}`),
          fetch(`/api/asistencia/admin/feriados?anio=${anio}&pais=${pais}`),
        ]);
        const dc = (await rc.json()) as RespuestaCalendario;
        const df = (await rf.json()) as { ok: boolean; feriados?: FeriadoCalendario[] };
        if (!dc.ok) throw new Error(dc.error || "No se pudo cargar el calendario");
        if (cancelado) return;
        setDatos(dc);
        setFeriadosAnio(df.ok ? df.feriados ?? [] : []);
      } catch (e) {
        if (!cancelado) toast.error(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        if (!cancelado) setClaveCargada(`${pais}|${anio}|${mes0}`);
      }
    })();
    return () => { cancelado = true; };
  }, [anio, mes0, pais, recarga]);

  const feriadosPorFecha = useMemo(() => {
    const m = new Map<string, FeriadoCalendario[]>();
    for (const f of datos?.feriados ?? []) m.set(f.fecha, [...(m.get(f.fecha) ?? []), f]);
    return m;
  }, [datos]);

  const ausenciasPorEmpleado = useMemo(() => {
    const m = new Map<number, AusenciaCalendario[]>();
    for (const a of datos?.ausencias ?? []) m.set(a.employee_id, [...(m.get(a.employee_id) ?? []), a]);
    return m;
  }, [datos]);

  const parcialesPorClave = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of datos?.parciales ?? []) {
      const k = `${p.employee_id}|${p.fecha}`;
      m.set(k, [...(m.get(k) ?? []), `${p.tipo_permiso === "medico" ? "Permiso médico" : "Permiso personal"} (parcial${p.state === "pendiente" ? ", pendiente" : ""})`]);
    }
    return m;
  }, [datos]);

  function ausenciaEn(empleadoId: number, clave: string): AusenciaCalendario | undefined {
    return (ausenciasPorEmpleado.get(empleadoId) ?? []).find((a) => a.fecha_inicio <= clave && clave <= a.fecha_fin);
  }

  function totalesEmpleado(empleadoId: number): Record<TipoAusencia, number> {
    const t: Record<TipoAusencia, number> = { vacaciones: 0, dia_libre: 0, descanso_medico: 0 };
    for (let d = 1; d <= nDias; d++) {
      const a = ausenciaEn(empleadoId, claveDia(anio, mes0, d));
      if (a) t[a.tipo] += 1;
    }
    return t;
  }

  function cambiarMes(delta: number) {
    const f = new Date(anio, mes0 + delta, 1);
    setAnio(f.getFullYear());
    setMes0(f.getMonth());
  }

  const feriadosDelMes = (datos?.feriados ?? []).filter((f) => f.fecha >= claveDia(anio, mes0, 1) && f.fecha <= claveDia(anio, mes0, nDias));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Calendario de ausencias — {pais === "ES" ? "España (local)" : "Perú (remotos)"}</h1>
          <p className="text-xs text-muted-foreground">
            Vacaciones, días libres y descansos médicos, con los feriados de {PAIS_LABEL[pais]}.
            {pais === "ES" ? " Incluye Comunidad de Madrid y Madrid capital." : ""}
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setNuevaAusencia({ empleadoId: "", fecha: claveDia(anio, mes0, 1) })}>
          <Plus className="size-4" /> Añadir ausencia
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><ChevronLeft className="size-4" /></Button>
        <div className="min-w-40 text-center text-sm font-semibold">{MESES[mes0]} {anio}</div>
        <Button variant="outline" size="icon" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><ChevronRight className="size-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => { setAnio(hoy.getFullYear()); setMes0(hoy.getMonth()); }}>Hoy</Button>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
          {TIPOS.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="inline-flex size-5 items-center justify-center rounded text-[10px] font-semibold" style={{ backgroundColor: TIPO_AUSENCIA_ESTILO[t].bg, color: TIPO_AUSENCIA_ESTILO[t].color }}>{TIPO_AUSENCIA_LETRA[t]}</span>
              {TIPO_AUSENCIA_LABEL[t]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="inline-block size-5 rounded bg-amber-200/80 dark:bg-amber-500/30" /> Feriado</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block size-5 rounded border border-dashed border-foreground/50" /> Pendiente de aprobar</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-44 border-b bg-card px-3 py-2 text-left font-medium">Empleado</th>
              {Array.from({ length: nDias }, (_, i) => i + 1).map((d) => {
                const clave = claveDia(anio, mes0, d);
                const ds = diaSemanaLunes0(anio, mes0, d);
                const fer = feriadosPorFecha.get(clave);
                return (
                  <th
                    key={d}
                    title={fer ? fer.map((f) => `${f.nombre} (${AMBITO_FERIADO_LABEL[f.ambito] ?? f.ambito})`).join("\n") : undefined}
                    className={`w-8 min-w-8 border-b px-0 py-1 text-center font-normal ${fer ? "bg-amber-200/80 dark:bg-amber-500/30" : ds >= 5 ? "bg-muted/60" : ""} ${clave === claveHoy ? "ring-1 ring-inset ring-primary" : ""}`}
                  >
                    <div className="text-[10px] text-muted-foreground">{LETRA_DIA[ds]}</div>
                    <div className="font-medium">{d}</div>
                  </th>
                );
              })}
              <th className="min-w-24 border-b px-2 py-2 text-center font-medium">Días</th>
            </tr>
          </thead>
          <tbody>
            {cargando && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}><td colSpan={nDias + 2} className="px-3 py-2"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {!cargando && (datos?.empleados.length ?? 0) === 0 && (
              <tr><td colSpan={nDias + 2} className="py-8 text-center text-muted-foreground">No hay empleados activos en este grupo.</td></tr>
            )}
            {!cargando && datos?.empleados.map((emp) => {
              const tot = totalesEmpleado(emp.id);
              return (
                <tr key={emp.id} className="border-b last:border-b-0">
                  <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium">{emp.nombre}</td>
                  {Array.from({ length: nDias }, (_, i) => i + 1).map((d) => {
                    const clave = claveDia(anio, mes0, d);
                    const ds = diaSemanaLunes0(anio, mes0, d);
                    const fer = feriadosPorFecha.get(clave);
                    const aus = ausenciaEn(emp.id, clave);
                    const parcial = parcialesPorClave.get(`${emp.id}|${clave}`);
                    const fondo = fer ? "bg-amber-200/50 dark:bg-amber-500/15" : ds >= 5 ? "bg-muted/40" : "";
                    return (
                      <td
                        key={d}
                        className={`h-8 border-l p-0 text-center ${fondo} ${aus || parcial ? "" : "cursor-pointer hover:bg-primary/10"}`}
                        onClick={() => {
                          if (aus) setDetalle({ ausencia: aus, empleado: emp.nombre });
                          else if (!parcial) setNuevaAusencia({ empleadoId: String(emp.id), fecha: clave });
                        }}
                        title={aus
                          ? `${TIPO_AUSENCIA_LABEL[aus.tipo]}${aus.state === "pendiente" ? " (pendiente de aprobar)" : ""}${aus.motivo ? ` — ${aus.motivo}` : ""}`
                          : parcial ? parcial.join("\n") : fer ? fer.map((f) => f.nombre).join("\n") : undefined}
                      >
                        {aus ? (
                          <span
                            className={`mx-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[10px] font-semibold ${aus.state === "pendiente" ? "border border-dashed border-foreground/60 opacity-80" : ""}`}
                            style={{ backgroundColor: TIPO_AUSENCIA_ESTILO[aus.tipo].bg, color: TIPO_AUSENCIA_ESTILO[aus.tipo].color }}
                          >
                            {TIPO_AUSENCIA_LETRA[aus.tipo]}
                          </span>
                        ) : parcial ? (
                          <span className="mx-auto flex h-6 w-6 items-center justify-center rounded border border-foreground/30 text-[10px]">½</span>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap border-l px-2 text-center text-[11px] text-muted-foreground">
                    {tot.vacaciones + tot.dia_libre + tot.descanso_medico === 0
                      ? "—"
                      : TIPOS.filter((t) => tot[t] > 0).map((t) => `${TIPO_AUSENCIA_LETRA[t]} ${tot[t]}`).join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {feriadosDelMes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Feriados de {MESES[mes0].toLowerCase()}: {feriadosDelMes.map((f) => `${Number(f.fecha.slice(8))} — ${f.nombre}`).join(" · ")}
        </p>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Feriados {anio} — {PAIS_LABEL[pais]}</h2>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNuevoFeriado(true)}><Plus className="size-4" /> Añadir feriado</Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Feriado</TableHead>
                <TableHead>Ámbito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feriadosAnio.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Sin feriados cargados para {anio}.</TableCell></TableRow>
              )}
              {feriadosAnio.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="whitespace-nowrap">{formatoFecha(f.fecha)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{NOMBRE_DIA[diaSemanaDeIso(f.fecha)]}</TableCell>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell>{AMBITO_FERIADO_LABEL[f.ambito] ?? f.ambito}</TableCell>
                  <TableCell>
                    {f.verificado ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Confirmado</span>
                    ) : (
                      <span title={f.fuente ?? undefined} className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Provisional</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      {!f.verificado && (
                        <Button
                          variant="outline" size="sm" className="h-7 gap-1"
                          title="Marcar como confirmado cuando ya esté publicado oficialmente"
                          onClick={async () => {
                            const r = await fetch(`/api/asistencia/admin/feriados/${f.id}/confirmar`, { method: "POST" });
                            const j = await r.json();
                            if (!j.ok) toast.error(j.error || "No se pudo confirmar"); else { toast.success("Feriado confirmado"); cargar(); }
                          }}
                        ><Check className="size-3.5" /> Confirmar</Button>
                      )}
                      <Button
                        variant="ghost" size="sm" className="h-7 text-destructive" aria-label={`Eliminar ${f.nombre}`}
                        onClick={async () => {
                          if (!window.confirm(`¿Eliminar el feriado «${f.nombre}» del ${formatoFecha(f.fecha)}?`)) return;
                          const r = await fetch(`/api/asistencia/admin/feriados/${f.id}/eliminar`, { method: "POST" });
                          const j = await r.json();
                          if (!j.ok) toast.error(j.error || "No se pudo eliminar"); else { toast.success("Feriado eliminado"); cargar(); }
                        }}
                      ><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          «Provisional» = fecha calculada o publicada solo en prensa; pasa a «Confirmado» al comprobarla en el boletín oficial.
        </p>
      </section>

      {nuevaAusencia && (
        <DialogoNuevaAusencia
          empleados={datos?.empleados ?? []}
          inicial={nuevaAusencia}
          onCerrar={() => setNuevaAusencia(null)}
          onGuardada={() => { setNuevaAusencia(null); cargar(); }}
        />
      )}

      {detalle && (
        <Dialog open onOpenChange={(o) => { if (!o) setDetalle(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{TIPO_AUSENCIA_LABEL[detalle.ausencia.tipo]} — {detalle.empleado}</DialogTitle>
              <DialogDescription>
                Del {formatoFecha(detalle.ausencia.fecha_inicio)} al {formatoFecha(detalle.ausencia.fecha_fin)}
                {detalle.ausencia.state === "pendiente" ? " · pendiente de aprobar (se aprueba en la pestaña Vacaciones)" : " · aprobada"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1 text-sm">
              {detalle.ausencia.motivo && <p><span className="text-muted-foreground">Motivo:</span> {detalle.ausencia.motivo}</p>}
              {detalle.ausencia.documento_nombre && <p><span className="text-muted-foreground">Documento:</span> {detalle.ausencia.documento_nombre}</p>}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  const r = await fetch(`/api/asistencia/admin/ausencias/${detalle.ausencia.id}/anular`, { method: "POST" });
                  const j = await r.json();
                  if (!j.ok) { toast.error(j.error || "No se pudo anular"); return; }
                  toast.success("Ausencia anulada");
                  setDetalle(null);
                  cargar();
                }}
              >Anular ausencia</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {nuevoFeriado && (
        <DialogoNuevoFeriado
          pais={pais}
          anio={anio}
          onCerrar={() => setNuevoFeriado(false)}
          onGuardado={() => { setNuevoFeriado(false); cargar(); }}
        />
      )}
    </div>
  );
}

function DialogoNuevaAusencia({
  empleados, inicial, onCerrar, onGuardada,
}: {
  empleados: { id: number; nombre: string }[];
  inicial: { empleadoId: string; fecha: string };
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const [empleadoId, setEmpleadoId] = useState(inicial.empleadoId);
  const [tipo, setTipo] = useState<TipoAusencia>("vacaciones");
  const [desde, setDesde] = useState(inicial.fecha);
  const [hasta, setHasta] = useState(inicial.fecha);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!empleadoId) { toast.error("Elige un empleado"); return; }
    if (!desde || !hasta || hasta < desde) { toast.error("Revisa las fechas: la final no puede ser anterior a la inicial"); return; }
    setGuardando(true);
    try {
      const r = await fetch("/api/asistencia/admin/ausencias", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: Number(empleadoId), tipo, fechaInicio: desde, fechaFin: hasta, motivo }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo guardar");
      if (j.solapaCon > 0) toast.warning(`Guardada, pero se solapa con ${j.solapaCon} ausencia(s) ya registradas de esa persona`);
      else toast.success("Ausencia registrada");
      onGuardada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir ausencia</DialogTitle>
          <DialogDescription>Queda aprobada al guardarla. Para un descanso médico, el empleado puede adjuntar el parte desde su kiosco.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Empleado</Label>
            <Select value={empleadoId} onValueChange={(v) => setEmpleadoId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Elige un empleado" /></SelectTrigger>
              <SelectContent>
                {empleados.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo((v ?? "vacaciones") as TipoAusencia)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_AUSENCIA_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); if (hasta < e.target.value) setHasta(e.target.value); }} />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Motivo (opcional)</Label>
            <Input value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: cita médica, vacaciones de verano…" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoNuevoFeriado({
  pais, anio, onCerrar, onGuardado,
}: { pais: PaisCalendario; anio: number; onCerrar: () => void; onGuardado: () => void }) {
  const [fecha, setFecha] = useState(`${anio}-01-01`);
  const [nombre, setNombre] = useState("");
  const [ambito, setAmbito] = useState(pais === "ES" ? "local" : "nacional");
  const [guardando, setGuardando] = useState(false);
  const ambitos = pais === "ES" ? ["nacional", "autonomico", "local"] : ["nacional"];

  async function guardar() {
    if (!fecha || !nombre.trim()) { toast.error("Indica la fecha y el nombre"); return; }
    setGuardando(true);
    try {
      const r = await fetch("/api/asistencia/admin/feriados", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, pais, ambito, nombre: nombre.trim() }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo guardar");
      toast.success("Feriado añadido");
      onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir feriado — {PAIS_LABEL[pais]}</DialogTitle>
          <DialogDescription>Por ejemplo un feriado local nuevo, un día no laborable decretado o un puente que la empresa dé a todos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
          </div>
          {ambitos.length > 1 && (
            <div className="space-y-1">
              <Label>Ámbito</Label>
              <Select value={ambito} onValueChange={(v) => setAmbito(v ?? "local")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ambitos.map((a) => <SelectItem key={a} value={a}>{AMBITO_FERIADO_LABEL[a]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
