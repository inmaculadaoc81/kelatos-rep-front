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

/** Mismo header que Agentes/Webs Kelatos (h-14, bg-primary, migas); la última miga sale de la ruta. */
export function AgentesV2Header() {
  const pathname = usePathname() || "";
  const resto = pathname.replace(/^\/agentes-v2\/?/, "");
  const primero = resto.split("/")[0];
  const titulo = primero ? TITULO_SECCION[primero] || primero : "Panel";
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
            {primero ? (
              <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href="/agentes-v2" />}>
                Agentes V2
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="text-primary-foreground">Agentes V2</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {primero && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-primary-foreground">{titulo}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
