"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const SECCIONES: Record<string, string> = {
  contenido: "Contenido",
  carruseles: "Carruseles IA",
  analitica: "Analítica",
};

export function RedesHeader() {
  const pathname = usePathname() || "";
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
                <BreadcrumbPage>{seccion}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
