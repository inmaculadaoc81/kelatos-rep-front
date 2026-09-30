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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building } from "@/lib/icons";
import { TITULO_SECCION } from "./navegacion";
import { useOrganizacion } from "./organizacion-context";

/** Selector de organización ("workspace"): cambia qué mini-empresa ven todas las pantallas de Agentes V2. Vacío
    en vez de oculto cuando solo hay una organización — así el hueco no "salta" al dar de alta la segunda. */
function SelectorOrganizacion() {
  const { organizaciones, organizacionId, cargando, seleccionar } = useOrganizacion();
  if (cargando && !organizaciones.length) return null;
  return (
    <Select value={organizacionId ?? undefined} onValueChange={(v) => v && seleccionar(v)}>
      <SelectTrigger className="h-8 w-44 border-primary-foreground/20 bg-primary-foreground/10 text-xs text-primary-foreground [&_svg]:text-primary-foreground/70">
        <Building className="size-3.5 shrink-0" />
        <SelectValue placeholder="Organización">{() => organizaciones.find((o) => o.id === organizacionId)?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {organizaciones.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
      <div className="ml-auto">
        <SelectorOrganizacion />
      </div>
    </header>
  );
}
