"use client";

import { useEffect, useState } from "react";

/** IDs de empleados que tienen al menos un dispositivo remoto asignado
    (asistencia.remote_devices.employee_id) — mismo endpoint que ya usa
    Remote Work, sin duplicar lógica. Lo usan las vistas de Administración
    reutilizadas (Fichajes/Vacaciones/Correcciones/Marcaciones olvidadas/
    Ausencias parciales) cuando se filtran en modo "solo remotos". */
export function useEmpleadosRemotosIds(activo: boolean): Set<number> | null {
  const [ids, setIds] = useState<Set<number> | null>(null);

  useEffect(() => {
    if (!activo) return;
    fetch("/api/asistencia/admin/remote-workers")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        setIds(new Set<number>(
          (d.dispositivos as { employee_id: number | null }[])
            .map((disp) => disp.employee_id)
            .filter((id): id is number => id != null),
        ));
      })
      .catch(() => setIds(new Set()));
  }, [activo]);

  return ids;
}
