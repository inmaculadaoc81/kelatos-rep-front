"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SECCIONES: Record<string, string> = {
  "/asistencia/contenido": "Piezas",
  "/asistencia/contenido/calendario": "Calendario",
  "/asistencia/contenido/recursos": "Recursos",
};

/** Cabecera del panel de contenido, mismo esquema que la de Gestión MAILS. */
export function ContenidoHeader() {
  const pathname = usePathname() || "";
  const seccion = SECCIONES[pathname];
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 bg-primary px-4 shadow-sm">
      <Breadcrumb>
        <BreadcrumbList className="text-primary-foreground/70">
          <BreadcrumbItem>
            <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href="/asistencia/kiosk" />}>
              Fichaje
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {seccion ? (
              <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href="/asistencia/contenido" />}>
                Contenido
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="text-primary-foreground">Contenido</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {seccion && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-primary-foreground">{seccion}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
