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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ItemDirecto, GrupoColapsable, type GrupoNavegacionBase } from "@/components/sidebar-grupo-colapsable";
import { Calendar, Video } from "@/lib/icons";
import { NavUser } from "@/app/(app)/nav-user";

const GRUPOS: GrupoNavegacionBase[] = [
  {
    titulo: "Contenido",
    icon: Video,
    items: [
      { label: "Piezas", href: "/asistencia/contenido", icon: Video },
      { label: "Programación", href: "/asistencia/contenido/programacion", icon: Calendar },
    ],
  },
];

/** Sidebar del panel de contenido — mismo esquema que el de Gestión MAILS
    (logo + trigger arriba, grupos, NavUser abajo). */
export function ContenidoSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link
            href="/asistencia/kiosk"
            className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
            aria-label="Volver a Fichaje"
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
              {GRUPOS.map((grupo) =>
                grupo.items.length === 1 ? (
                  <ItemDirecto key={grupo.titulo} item={grupo.items[0]} pathname={pathname} />
                ) : (
                  <GrupoColapsable key={grupo.titulo} titulo={grupo.titulo} icon={grupo.icon} items={grupo.items} pathname={pathname} />
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
