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
import { GRUPOS } from "./navegacion";

/**
 * Migas derivadas de la ruta usando el mismo árbol que pinta el menú, para
 * que el grupo ("Reparaciones", "Catálogos"…) y la etiqueta no se dupliquen
 * en dos sitios y puedan quedar desincronizados.
 */
function localizar(pathname: string): { grupo: string; label: string } | null {
  for (const grupo of GRUPOS) {
    for (const item of grupo.items) {
      if (item.href && item.href === pathname) {
        return { grupo: grupo.titulo, label: item.label };
      }
    }
  }
  return null;
}

export function Migas() {
  const pathname = usePathname();
  const actual = localizar(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {pathname === "/" ? (
            <BreadcrumbPage>Kelatos</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link href="/" />}>Kelatos</BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {actual && pathname !== "/" && (
          <>
            {/* El grupo no es navegable: es un encabezado del menú, no una
                página, así que va como texto y no como enlace. */}
            <BreadcrumbSeparator />
            <BreadcrumbItem className="hidden sm:block">
              <span className="text-muted-foreground">{actual.grupo}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{actual.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
