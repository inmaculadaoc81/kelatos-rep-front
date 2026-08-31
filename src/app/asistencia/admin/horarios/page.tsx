"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/confirm-provider";
import { Add, Trash, Save2, Clock, Setting2 } from "@/lib/icons";

interface Franja { dayofweek: string; hour_from: number; hour_to: number; }
interface EmpleadoResumen { id: number; nombre: string; }
interface Calendario { id: number; nombre: string; franjas: Franja[]; empleados: EmpleadoResumen[]; }
interface Empleado { id: number; nombre: string; resource_calendar_id: number | null }

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function decimalAHHMM(h: number): string {
  const hh = Math.trunc(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function hhmmADecimal(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}
function horasSemana(franjas: Franja[]): number {
  return franjas.reduce((acc, f) => acc + Math.max(0, f.hour_to - f.hour_from), 0);
}

/** Panel "Horarios" — equivale a resource.calendar de Odoo: plantillas
    semanales asignables a empleados. Sin esto, "Horas extras" en el
    informe/detalle de fichaje no tiene un horario pactado real con el que
    compararse — petición explícita del usuario tras ver la ficha de
    horario de un empleado en Odoo, 2026-08-31. */
export default function HorariosPage() {
  const [calendarios, setCalendarios] = useState<Calendario[] | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);
  const confirm = useConfirm();

  async function cargar() {
    setCargando(true);
    try {
      const [rCal, rEmp] = await Promise.all([
        fetch("/api/asistencia/admin/calendarios").then((r) => r.json()),
        fetch("/api/asistencia/admin/empleados").then((r) => r.json()),
      ]);
      if (rCal.ok) setCalendarios(rCal.calendarios);
      if (rEmp.ok) setEmpleados(rEmp.empleados);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function crearCalendario() {
    if (!nombreNuevo.trim()) return toast.error("Ponle un nombre al horario");
    setCreando(true);
    try {
      const res = await fetch("/api/asistencia/admin/calendarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreNuevo.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setNombreNuevo("");
      toast.success("Horario creado");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCreando(false);
    }
  }

  async function eliminarCalendario(cal: Calendario) {
    if (cal.empleados.length > 0) return toast.error("Reasigna primero a los empleados de este horario");
    const ok = await confirm(`¿Eliminar "${cal.nombre}"? Esta acción no se puede deshacer.`, { titulo: "Eliminar horario" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/asistencia/admin/calendarios/${cal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Horario eliminado");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Horarios</h1>
        <p className="text-xs text-muted-foreground">
          Plantillas semanales asignadas a cada empleado — el "Total Horas"/"Horas extras" de fichajes e informes se calculan contra esto.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Nombre del nuevo horario (p. ej. Turno 08:00–17:00)" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} className="max-w-xs" />
        <Button size="sm" className="gap-1.5" disabled={creando} onClick={crearCalendario}>
          <Add className="size-3.5" /> {creando ? "Creando…" : "Nuevo horario"}
        </Button>
      </div>

      {cargando && (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!cargando && calendarios && calendarios.length === 0 && (
        <div className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">Todavía no hay horarios creados.</div>
      )}

      {!cargando && calendarios && (
        <div className="grid gap-3 md:grid-cols-2">
          {calendarios.map((cal) => (
            <CalendarioCard key={cal.id} calendario={cal} empleados={empleados} onEliminar={() => eliminarCalendario(cal)} onCambiado={cargar} />
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarioCard({
  calendario,
  empleados,
  onEliminar,
  onCambiado,
}: {
  calendario: Calendario;
  empleados: Empleado[];
  onEliminar: () => void;
  onCambiado: () => void;
}) {
  const [nombre, setNombre] = useState(calendario.nombre);
  const [franjas, setFranjas] = useState<Franja[]>(calendario.franjas.map((f) => ({ ...f })));
  const [guardando, setGuardando] = useState(false);
  const [asignando, setAsignando] = useState(false);

  useEffect(() => { setNombre(calendario.nombre); setFranjas(calendario.franjas.map((f) => ({ ...f }))); }, [calendario]);

  function actualizarFranja(idx: number, cambios: Partial<Franja>) {
    setFranjas((prev) => prev.map((f, i) => (i === idx ? { ...f, ...cambios } : f)));
  }
  function quitarFranja(idx: number) {
    setFranjas((prev) => prev.filter((_, i) => i !== idx));
  }
  function agregarFranja() {
    setFranjas((prev) => [...prev, { dayofweek: prev.at(-1)?.dayofweek ?? "0", hour_from: 8, hour_to: 12 }]);
  }

  async function guardarNombre() {
    if (!nombre.trim() || nombre.trim() === calendario.nombre) { setNombre(calendario.nombre); return; }
    try {
      const res = await fetch(`/api/asistencia/admin/calendarios/${calendario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Nombre actualizado");
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      setNombre(calendario.nombre);
    }
  }

  async function guardarFranjas() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/asistencia/admin/calendarios/${calendario.id}/franjas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franjas }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Horario guardado");
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  async function asignarEmpleado(employeeId: string) {
    if (!employeeId) return;
    setAsignando(true);
    try {
      const res = await fetch(`/api/asistencia/admin/empleados/${employeeId}/calendario`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarioId: calendario.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      toast.success("Empleado asignado");
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setAsignando(false);
    }
  }

  async function quitarEmpleado(employeeId: number) {
    try {
      const res = await fetch(`/api/asistencia/admin/empleados/${employeeId}/calendario`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarioId: null }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      onCambiado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const disponibles = empleados.filter((e) => e.resource_calendar_id !== calendario.id);
  const cambioSinGuardar = JSON.stringify(franjas) !== JSON.stringify(calendario.franjas);

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} onBlur={guardarNombre} className="h-8 max-w-56 font-medium" />
          <Button variant="ghost" size="icon-sm" onClick={onEliminar} title="Eliminar horario">
            <Trash className="size-4 text-destructive" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5" /> Franjas semanales · {horasSemana(franjas).toFixed(1)} h/semana
          </p>
          <div className="space-y-1.5">
            {franjas.map((f, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Select value={f.dayofweek} onValueChange={(v) => actualizarFranja(idx, { dayofweek: v || f.dayofweek })}>
                  <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input type="time" className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs" value={decimalAHHMM(f.hour_from)} onChange={(e) => actualizarFranja(idx, { hour_from: hhmmADecimal(e.target.value) })} />
                <span className="text-xs text-muted-foreground">a</span>
                <input type="time" className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs" value={decimalAHHMM(f.hour_to)} onChange={(e) => actualizarFranja(idx, { hour_to: hhmmADecimal(e.target.value) })} />
                <Button variant="ghost" size="icon-sm" onClick={() => quitarFranja(idx)}>
                  <Trash className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {franjas.length === 0 && <p className="text-xs text-muted-foreground">Sin franjas — añade al menos una.</p>}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={agregarFranja}>
              <Add className="size-3.5" /> Franja
            </Button>
            <Button size="sm" className="gap-1.5" disabled={!cambioSinGuardar || guardando} onClick={guardarFranjas}>
              <Save2 className="size-3.5" /> {guardando ? "Guardando…" : "Guardar horario"}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 border-t pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Setting2 className="size-3.5" /> Empleados con este horario
          </p>
          <div className="flex flex-wrap gap-1.5">
            {calendario.empleados.map((e) => (
              <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                {e.nombre}
                <button type="button" onClick={() => quitarEmpleado(e.id)} className="text-muted-foreground hover:text-foreground" title="Quitar de este horario">×</button>
              </span>
            ))}
            {calendario.empleados.length === 0 && <span className="text-xs text-muted-foreground">Ninguno</span>}
          </div>
          {disponibles.length > 0 && (
            <Select value="" onValueChange={(v) => v && asignarEmpleado(v)} disabled={asignando}>
              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="+ Asignar empleado…" /></SelectTrigger>
              <SelectContent>
                {disponibles.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
