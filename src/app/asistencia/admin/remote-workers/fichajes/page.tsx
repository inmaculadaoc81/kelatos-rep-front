"use client";

import { FichajesView } from "../../fichajes/fichajes-view";

/** Misma vista de Fichajes que Administración (filtros, agrupar, columnas,
    detalle) — reutilizada, no duplicada — pero restringida a empleados
    con un dispositivo remoto asignado. */
export default function FichajesRemotosPage() {
  return <FichajesView soloRemotos />;
}
