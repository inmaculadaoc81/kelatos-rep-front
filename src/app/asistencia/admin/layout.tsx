"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECCIONES = [
  { href: "/asistencia/admin/fichajes", label: "Fichajes" },
  { href: "/asistencia/admin/vacaciones", label: "Vacaciones" },
  { href: "/asistencia/admin/correcciones", label: "Correcciones" },
  { href: "/asistencia/admin/marcaciones-olvidadas", label: "Marcaciones olvidadas" },
  { href: "/asistencia/admin/ausencias-parciales", label: "Ausencias parciales" },
];

export default function AsistenciaAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              pathname === s.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
