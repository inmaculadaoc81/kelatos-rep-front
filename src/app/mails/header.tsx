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

const SECCIONES: Record<string, string> = {
  "/mails/bandeja": "Centro de mails",
  "/mails/leads": "Leads",
  "/mails/buzones": "Buzones",
};

/** Mismo header que Agentes/Webs Kelatos/Transferencias (h-14, bg-primary,
    migas), con la sección actual. */
export function MailsHeader() {
  const pathname = usePathname() || "";
  const seccion = Object.entries(SECCIONES).find(([ruta]) => pathname === ruta || pathname.startsWith(`${ruta}/`))?.[1];
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
            {seccion ? (
              <BreadcrumbLink className="text-primary-foreground/70 hover:text-primary-foreground" render={<Link href="/mails/bandeja" />}>
                Gestión MAILS
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="text-primary-foreground">Gestión MAILS</BreadcrumbPage>
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
    </header>
  );
}
