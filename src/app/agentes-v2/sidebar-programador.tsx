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
import { Calendar, Category } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";
import { OrganizacionSwitcher } from "./organizacion-switcher";

const ITEMS = [
  { label: "Programar contenido", href: "/agentes-v2/programar", icon: Calendar },
  { label: "Carruseles", href: "/agentes-v2/carruseles", icon: Category },
];

/** Sidebar reducido de Agentes V2 para la community manager: mismo aspecto que el de administración, con el selector de
    marca y solo lo que ella necesita (programar y revisar/editar los carruseles). */
export function ProgramadorSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname() || "";
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link
            href="/asistencia/contenido"
            className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
            aria-label="Volver a mi panel de Contenido"
          >
            <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            <Image src="/logos/kelatos-icono.png" alt="Kelatos" width={81} height={82} priority unoptimized className="hidden h-7 w-auto shrink-0 group-data-[collapsible=icon]:block" />
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
        <OrganizacionSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Redes sociales</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((it) => (
                <SidebarMenuItem key={it.href}>
                  <SidebarMenuButton isActive={pathname.startsWith(it.href)} tooltip={it.label} render={<Link href={it.href} />}>
                    <it.icon />
                    <span>{it.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
