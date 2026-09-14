"use client";

import { EmpleadosView } from "../../empleados/empleados-view";

/** Misma vista de Empleados que Administración (alta, edición, modalidad,
    contraseña) — reutilizada, no duplicada — pero mostrando solo a los
    marcados como "Trabaja en remoto". */
export default function EmpleadosRemotosPage() {
  return <EmpleadosView soloRemotos />;
}
