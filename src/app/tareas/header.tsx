"use client";

import { BotonMenuMovil } from "@/components/boton-menu-movil";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Mismo header que Webs Kelatos/Asistencia (h-14, bg-primary, migas), sin los
    botones propios de Reparaciones. */
export function TareasHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 sm:gap-4 bg-primary px-3 sm:px-4 shadow-sm">
      <BotonMenuMovil />
      <Breadcrumb>
        <BreadcrumbList className="text-primary-foreground/70">
          <BreadcrumbItem>
            <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href="/" />}>
              Kelatos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary-foreground">Tareas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
