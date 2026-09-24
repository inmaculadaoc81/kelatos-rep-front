"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ItemDirecto, GrupoColapsable } from "@/components/sidebar-grupo-colapsable";
import type { Session } from "next-auth";
import { GRUPOS, GRUPO_ADMIN, GRUPO_CONTABILIDAD } from "./navegacion";
import { NavUser } from "./nav-user";
import { esSuperadmin } from "@/lib/superadmin";

export function AppSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const superadmin = esSuperadmin(session?.user?.email);
  const esAdmin = session?.user?.role === "admin" || superadmin;
  const base = esAdmin
    ? GRUPOS.flatMap((g) => (g.titulo === "Facturación" ? [g, GRUPO_CONTABILIDAD] : [g]))
    : GRUPOS;
  const grupos = superadmin ? [...base, GRUPO_ADMIN] : base;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        {/* Desplegado: logo a la izquierda y botón al final. Colapsado (3rem)
            no caben en fila, así que se apilan. */}
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          {/* Dos ficheros distintos y no un recorte del mismo: el logotipo
              completo lleva el nombre junto al icono y, colapsado, solo cabe
              el icono. Sin padding propio en el enlace — SidebarHeader ya
              pone el suyo y, sumados, dejaban 15 px útiles y lo aplastaban. */}
          {/* Fondo claro fijo alrededor del logo: el PNG lleva el texto en
              azul oscuro sobre transparente, ilegible sobre el panel oscuro
              del tema dark. En claro el chip se funde con el panel blanco. */}
          <Link
            href="/"
            className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
            aria-label="Kelatos — inicio"
          >
            <Image
              src="/logos/kelatos.png"
              alt="Kelatos"
              width={290}
              height={82}
              priority
              unoptimized
              className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden"
            />
            <Image
              src="/logos/kelatos-icono.png"
              alt="Kelatos"
              width={81}
              height={82}
              priority
              unoptimized
              className="hidden h-7 w-auto shrink-0 group-data-[collapsible=icon]:block"
            />
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {grupos.map((grupo) =>
                grupo.items.length === 1 ? (
                  // Grupo de un solo item: enlace directo, sin desplegable.
                  // Un desplegable con un único hijo es un clic de más para
                  // llegar al mismo sitio.
                  <ItemDirecto key={grupo.titulo} item={grupo.items[0]} pathname={pathname} />
                ) : (
                  <GrupoColapsable key={grupo.titulo} titulo={grupo.titulo} icon={grupo.icon} claseIcono={grupo.claseIcono} items={grupo.items} pathname={pathname} />
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
