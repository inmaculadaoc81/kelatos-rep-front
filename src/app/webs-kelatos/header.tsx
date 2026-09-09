"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Mismo header que (app)/layout.tsx (h-14, bg-primary, migas) pero sin
    los botones propios de Reparaciones (buscador, notificaciones, código
    de acceso) — petición del usuario, 2026-09-09. */
export function WebsKelatosHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 bg-primary px-4 shadow-sm">
      <Breadcrumb>
        <BreadcrumbList className="text-primary-foreground/70">
          <BreadcrumbItem>
            <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href="/" />}>
              Kelatos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary-foreground">Webs Kelatos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
