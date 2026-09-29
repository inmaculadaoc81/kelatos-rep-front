"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Tarea } from "@/lib/tareas";
import type { EmpleadoTareas } from "@/app/api/tareas/empleados/route";

/** Carga compartida por las 4 vistas (Tablero/Resumen/Por persona/Calendario):
    misma lista de tareas y del directorio completo de empleados (incluidos los
    remotos), un solo fetch por vista. */
export function useTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoTareas[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/tareas");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setTareas(data.tareas as Tarea[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    fetch("/api/tareas/empleados").then((r) => r.json()).then((d) => { if (d.ok) setEmpleados(d.empleados as EmpleadoTareas[]); }).catch(() => {});
  }, [cargar]);

  const empleadoPorEmail = useMemo(() => {
    const m = new Map<string, EmpleadoTareas>();
    for (const e of empleados) if (e.email) m.set(e.email, e);
    return m;
  }, [empleados]);

  function actualizarEnLista(tarea: Tarea) {
    setTareas((prev) => (prev.some((t) => t.id === tarea.id) ? prev.map((t) => (t.id === tarea.id ? tarea : t)) : [tarea, ...prev]));
  }
  function quitarDeLista(id: number) {
    setTareas((prev) => prev.filter((t) => t.id !== id));
  }

  return { tareas, empleados, empleadoPorEmail, cargando, error, cargar, actualizarEnLista, quitarDeLista };
}
