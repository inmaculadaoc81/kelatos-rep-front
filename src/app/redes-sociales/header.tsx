"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useOrganizacion } from "../agentes-v2/organizacion-context";

const SECCIONES: Record<string, { titulo: string; porOrganizacion: boolean }> = {
  piezas: { titulo: "Piezas", porOrganizacion: false },
  contenido: { titulo: "Subidos y pendientes", porOrganizacion: false },
  calendario: { titulo: "Calendario", porOrganizacion: false },
  recursos: { titulo: "Recursos", porOrganizacion: false },
  redes: { titulo: "Redes sociales", porOrganizacion: true },
  carruseles: { titulo: "Carruseles IA", porOrganizacion: true },
  programar: { titulo: "Programar carruseles", porOrganizacion: true },
  aprobaciones: { titulo: "Aprobaciones", porOrganizacion: true },
  "seo-local": { titulo: "SEO local", porOrganizacion: true },
  analitica: { titulo: "Analítica", porOrganizacion: true },
};

export function RedesHeader() {
  const pathname = usePathname() || "";
  const { organizacion } = useOrganizacion();
  const seccion = SECCIONES[pathname.replace(/^\/redes-sociales\/?/, "").split("/")[0]];
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Kelatos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {seccion ? <BreadcrumbLink render={<Link href="/redes-sociales" />}>Redes sociales</BreadcrumbLink> : <BreadcrumbPage>Redes sociales</BreadcrumbPage>}
          </BreadcrumbItem>
          {seccion && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{seccion.titulo}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      {seccion?.porOrganizacion && organizacion && (
        <span className="ml-auto rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground" title="Organización elegida en el menú de la izquierda">
          {organizacion.name}
        </span>
      )}
    </header>
  );
}
