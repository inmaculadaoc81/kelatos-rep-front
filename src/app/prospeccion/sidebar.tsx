"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { ComponentType } from "react";
import { Chart, Sms, Setting2, SearchNormal1, Profile2User } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";

const SECCIONES: { titulo: string; vistas: { href: string; etiqueta: string; icono: ComponentType<{ className?: string }> }[] }[] = [
  {
    titulo: "Clientes",
    vistas: [
      { href: "/prospeccion/clientes", etiqueta: "Resumen", icono: Chart },
      { href: "/prospeccion/clientes/lista", etiqueta: "Clientes que aceptaron", icono: Profile2User },
      { href: "/prospeccion/clientes/correos", etiqueta: "Correos", icono: Sms },
      { href: "/prospeccion/clientes/agente", etiqueta: "Agente", icono: Setting2 },
    ],
  },
  {
    titulo: "Empresas",
    vistas: [
      { href: "/prospeccion/empresas", etiqueta: "Resumen", icono: Chart },
      { href: "/prospeccion/empresas/buscar", etiqueta: "Buscar empresas", icono: SearchNormal1 },
      { href: "/prospeccion/empresas/correos", etiqueta: "Correos", icono: Sms },
      { href: "/prospeccion/empresas/agente", etiqueta: "Agente y búsqueda diaria", icono: Setting2 },
    ],
  },
];

/** Mismo esqueleto (logo + NavUser) que Tareas/Webs Kelatos. */
export function ProspeccionSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link
            href="/"
            className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
            aria-label="Volver a Reparaciones"
          >
            <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            <Image src="/logos/kelatos-icono.png" alt="Kelatos" width={81} height={82} priority unoptimized className="hidden h-7 w-auto shrink-0 group-data-[collapsible=icon]:block" />
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {SECCIONES.map((sec) => (
          <SidebarGroup key={sec.titulo}>
            <SidebarGroupLabel>{sec.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sec.vistas.map((v) => (
                  <SidebarMenuItem key={v.href}>
                    <SidebarMenuButton isActive={pathname === v.href} tooltip={`${sec.titulo}: ${v.etiqueta}`} render={<Link href={v.href} />}>
                      <v.icono className="text-sidebar-primary" />
                      <span>{v.etiqueta}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
