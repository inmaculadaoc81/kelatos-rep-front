"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITULOS: Record<string, string> = {
  "/asistencia/kiosk": "Fichar",
  "/asistencia/kiosk/mes": "Mi mes",
  "/asistencia/kiosk/solicitudes": "Solicitudes",
  "/asistencia/admin/fichajes": "Fichajes",
  "/asistencia/admin/horarios": "Horarios",
  "/asistencia/admin/vacaciones": "Vacaciones",
  "/asistencia/admin/correcciones": "Correcciones",
  "/asistencia/admin/marcaciones-olvidadas": "Marcaciones olvidadas",
  "/asistencia/admin/ausencias-parciales": "Ausencias parciales",
  "/asistencia/admin/auditoria": "Auditoría",
  "/asistencia/admin/informe": "Informe mensual",
};

export function AsistenciaHeader() {
  const pathname = usePathname();
  const titulo = TITULOS[pathname || ""] || "Asistencia";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 shadow-sm">
      <SidebarTrigger />
      <h1 className="text-sm font-semibold">{titulo}</h1>
    </header>
  );
}
