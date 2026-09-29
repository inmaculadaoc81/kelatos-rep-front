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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ClipboardTick, Chart, Profile2User, Calendar } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";

const VISTAS = [
  { href: "/tareas", etiqueta: "Tablero", icono: ClipboardTick },
  { href: "/tareas/resumen", etiqueta: "Resumen", icono: Chart },
  { href: "/tareas/por-persona", etiqueta: "Por persona", icono: Profile2User },
  { href: "/tareas/calendario", etiqueta: "Calendario", icono: Calendar },
];

/** 4 vistas de las mismas tareas (tipo Notion: mismos datos, distintas formas de
    mirarlos) — petición del usuario, 2026-09-29. Mismo esqueleto (logo + NavUser)
    que Webs Kelatos/Asistencia. */
export function TareasSidebar({ session }: { session: Session | null }) {
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {VISTAS.map((v) => (
                <SidebarMenuItem key={v.href}>
                  <SidebarMenuButton isActive={pathname === v.href} tooltip={v.etiqueta} render={<Link href={v.href} />}>
                    <v.icono className="text-sidebar-primary" />
                    <span>{v.etiqueta}</span>
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
