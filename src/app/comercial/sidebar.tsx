"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarTrigger } from "@/components/ui/sidebar";
import { ItemDirecto, type ItemNavegacionBase } from "@/components/sidebar-grupo-colapsable";
import { Category, Clock, Calendar, DocumentText, Profile2User, Chart, DocumentUpload, SearchNormal1 } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";

const HOY: ItemNavegacionBase = { label: "Hoy", href: "/comercial", icon: Category, exacto: true };
const CONTACTOS: ItemNavegacionBase = { label: "Contactos", href: "/comercial/contactos", icon: SearchNormal1 };
const HISTORIAL: ItemNavegacionBase = { label: "Mis llamadas", href: "/comercial/historial", icon: Clock };
const REUNIONES: ItemNavegacionBase = { label: "Reuniones", href: "/comercial/reuniones", icon: Calendar };
const GUION: ItemNavegacionBase = { label: "Guion de llamada", href: "/comercial/guion", icon: DocumentText };
const LISTAS: ItemNavegacionBase = { label: "Listas e importación", href: "/comercial/admin/listas", icon: DocumentUpload };
const AGENTES: ItemNavegacionBase = { label: "Agentes", href: "/comercial/admin/agentes", icon: Profile2User };
const ACTIVIDAD: ItemNavegacionBase = { label: "Actividad", href: "/comercial/admin/actividad", icon: Chart };

export function ComercialSidebar({ session, admin }: { session: Session | null; admin: boolean }) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link
            href={admin ? "/" : "/comercial"}
            className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
            aria-label="Inicio"
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
            <SidebarMenu className="gap-1.5">
              <ItemDirecto item={HOY} pathname={pathname} />
              <ItemDirecto item={CONTACTOS} pathname={pathname} />
              <ItemDirecto item={HISTORIAL} pathname={pathname} />
              <ItemDirecto item={REUNIONES} pathname={pathname} />
              <ItemDirecto item={GUION} pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {admin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <ItemDirecto item={LISTAS} pathname={pathname} />
                <ItemDirecto item={AGENTES} pathname={pathname} />
                <ItemDirecto item={ACTIVIDAD} pathname={pathname} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}

