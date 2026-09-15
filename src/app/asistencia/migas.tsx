"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { localizarItemAsistencia } from "./navegacion";

/**
 * Migas del header de Asistencia — antes era un subtítulo estático fijo
 * ("Dashboard Asistencia") dentro del propio sidebar; petición del
 * usuario, 2026-09-15: que viva en el header como breadcrumb
 * ("Dashboard Asistencia > Fichajes"), igual que ya hace Migas en
 * Reparaciones (src/app/(app)/migas.tsx) con GRUPOS/localizar().
 */
export function AsistenciaMigas() {
  const pathname = usePathname();
  const item = localizarItemAsistencia(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {item ? (
            <span className="text-muted-foreground">Dashboard Asistencia</span>
          ) : (
            <BreadcrumbPage>Dashboard Asistencia</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {item && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
