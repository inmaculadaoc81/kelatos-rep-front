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
import { Button } from "@/components/ui/button";
import { Clock } from "@/lib/icons";

const SECCIONES: Record<string, string> = {
  "/asistencia/contenido": "Piezas",
  "/asistencia/contenido/calendario": "Calendario",
  "/asistencia/contenido/recursos": "Recursos",
};

/** Cabecera del panel de contenido, mismo esquema que la de Gestión MAILS.
    El botón de "Volver a Fichaje" es el simétrico del botón "Panel de
    contenido" que ya tiene el kiosco en su propia cabecera (kiosk/layout.tsx)
    — sin este, quien entra aquí desde el kiosco no tenía ningún botón
    visible para volver, solo el logo del sidebar (petición del usuario,
    2026-10-07). */
export function ContenidoHeader() {
  const pathname = usePathname() || "";
  const seccion = SECCIONES[pathname];
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 bg-primary px-4 shadow-sm">
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
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-primary-foreground/70 hover:bg-white/15 hover:text-primary-foreground"
        title="Volver a Fichaje"
        render={<Link href="/asistencia/kiosk" />}
      >
        <Clock className="size-4" />
      </Button>
    </header>
  );
}
