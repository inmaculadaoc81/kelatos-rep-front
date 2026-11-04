"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarTrigger } from "@/components/ui/sidebar";
import { ItemDirecto, type GrupoNavegacionBase } from "@/components/sidebar-grupo-colapsable";
import { Calendar, Category, Chart, Gallery, Home, Video } from "@/lib/icons";
import { NavUser } from "@/app/(app)/nav-user";
import { OrganizacionSwitcher } from "../agentes-v2/organizacion-switcher";

/** Elementos del menú de Redes sociales. «Calendario» y «Programar» siguen en sus pantallas de siempre. */
const ITEMS: GrupoNavegacionBase["items"] = [
  { label: "Resumen", href: "/redes-sociales", icon: Home, exacto: true },
  { label: "Contenido", href: "/redes-sociales/contenido", icon: Video },
  { label: "Carruseles IA", href: "/redes-sociales/carruseles", icon: Gallery },
  { label: "Calendario", href: "/asistencia/contenido/calendario", icon: Calendar },
  { label: "Programar carruseles", href: "/agentes-v2/programar", icon: Category },
  { label: "Analítica", href: "/redes-sociales/analitica", icon: Chart },
];

/** Sidebar de Redes sociales (logo + trigger arriba, selector de marca, menú, NavUser abajo). */
export function RedesSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link href="/" className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5" aria-label="Volver al dashboard">
            <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            <Image src="/logos/kelatos-icono.png" alt="Kelatos" width={81} height={82} priority unoptimized className="hidden h-7 w-auto shrink-0 group-data-[collapsible=icon]:block" />
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
        <OrganizacionSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {ITEMS.map((item) => (
                <ItemDirecto key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
