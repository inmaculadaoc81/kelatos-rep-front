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
import { TITULO_SECCION } from "./navegacion";

/** Cabecera blanca (h-14, con borde inferior), migas de pan; la última miga sale de la ruta.
    El selector de organización vive en el sidebar (OrganizacionSwitcher), no aquí. */
export function AgentesV2Header() {
  const pathname = usePathname() || "";
  const resto = pathname.replace(/^\/agentes-v2\/?/, "");
  const primero = resto.split("/")[0];
  const titulo = primero ? TITULO_SECCION[primero] || primero : "Panel";
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Kelatos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {primero ? (
              <BreadcrumbLink render={<Link href="/agentes-v2" />}>Agentes V2</BreadcrumbLink>
            ) : (
              <BreadcrumbPage>Agentes V2</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {primero && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{titulo}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
