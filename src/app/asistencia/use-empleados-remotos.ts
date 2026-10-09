"use client";

import { useEffect, useState } from "react";

/** IDs de empleados marcados como remotos de verdad
    (asistencia.empleados.trabaja_remoto = true) — NO "tiene un dispositivo
    remoto registrado": un empleado local puede tener un dispositivo
    asignado (p. ej. de pruebas) sin trabajar en remoto, y viceversa. Bug
    real encontrado 2026-10-09: la versión anterior de este hook usaba
    /api/asistencia/admin/remote-workers (dispositivos), lo que sacó a
    Iván y Romer (locales con dispositivo) de las vistas de Administración
    y dejó a Cielo Admin (remoto sin dispositivo) metido ahí por error.
    Lo usan las vistas de Administración reutilizadas (Fichajes/Vacaciones/
    Correcciones/Marcaciones olvidadas/Ausencias parciales) cuando se
    filtran en modo "solo remotos". */
export function useEmpleadosRemotosIds(activo: boolean): Set<number> | null {
  const [ids, setIds] = useState<Set<number> | null>(null);

  useEffect(() => {
    if (!activo) return;
    fetch("/api/asistencia/admin/empleados")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        setIds(new Set<number>(
          (d.empleados as { id: number; trabaja_remoto: boolean }[])
            .filter((e) => e.trabaja_remoto)
            .map((e) => e.id),
        ));
      })
      .catch(() => setIds(new Set()));
  }, [activo]);

  return ids;
}
