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

/** Mismo header que Tareas/Webs Kelatos (h-14, bg-primary, migas). */
export function CrmHeader() {
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
            <BreadcrumbPage className="text-primary-foreground">CRM</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
