"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

const VISTAS: Record<string, string> = { correo: "Mi correo", comunicados: "Comunicados", gestion: "Gestión de RRHH" };

/** Mismo header que las demás vistas (h-14, color principal, migas). El botón del menú solo hace falta en móvil. */
export function RrhhHeader() {
  const vista = VISTAS[usePathname().split("/")[2] || ""] || "Mi correo";
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 bg-primary px-4 shadow-sm">
      <SidebarTrigger className="text-primary-foreground md:hidden" />
      <Breadcrumb>
        <BreadcrumbList className="text-primary-foreground/70">
          <BreadcrumbItem>
            <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href="/" />}>Kelatos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href="/rrhh/correo" />}>Recursos Humanos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary-foreground">{vista}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
