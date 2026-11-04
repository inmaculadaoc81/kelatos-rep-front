"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarTrigger } from "@/components/ui/sidebar";
import { ItemDirecto, type ItemNavegacionBase } from "@/components/sidebar-grupo-colapsable";
import { Calendar, Category, Chart, Cpu, Folder2, Gallery, Global, Home, DocumentText, SearchNormal1, TickCircle, Video } from "@/lib/icons";
import { NavUser } from "@/app/(app)/nav-user";
import { OrganizacionSwitcher } from "../agentes-v2/organizacion-switcher";
import type { RolRedes } from "./acceso";

type Item = ItemNavegacionBase & { soloAdmin?: boolean };

/** Lo general: no depende de la organización (las piezas y vídeos son de todas las marcas). */
const GENERAL: Item[] = [
  { label: "Resumen", href: "/redes-sociales", icon: Home, exacto: true },
  { label: "Piezas", href: "/redes-sociales/piezas", icon: Video },
  { label: "Subidos y pendientes", href: "/redes-sociales/contenido", icon: DocumentText },
  { label: "Calendario", href: "/redes-sociales/calendario", icon: Calendar },
  { label: "Recursos", href: "/redes-sociales/recursos", icon: Folder2 },
];

/** Lo que cambia con la organización elegida arriba: sus carruseles, su SEO local y su analítica. */
const POR_ORGANIZACION: Item[] = [
  { label: "Redes sociales", href: "/redes-sociales/redes", icon: Global, soloAdmin: true },
  { label: "Carruseles IA", href: "/redes-sociales/carruseles", icon: Gallery },
  { label: "Programar carruseles", href: "/redes-sociales/programar", icon: Category },
  { label: "Aprobaciones", href: "/redes-sociales/aprobaciones", icon: TickCircle, soloAdmin: true },
  { label: "SEO local", href: "/redes-sociales/seo-local", icon: SearchNormal1, soloAdmin: true },
  { label: "Analítica", href: "/redes-sociales/analitica", icon: Chart },
];

/** Sidebar de Redes sociales: arriba lo general, debajo lo de cada organización (con su selector). */
export function RedesSidebar({ session, rol }: { session: Session | null; rol: RolRedes }) {
  const pathname = usePathname();
  const visibles = (items: Item[]) => items.filter((i) => rol === "admin" || !i.soloAdmin);
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Contenido · todas las marcas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {visibles(GENERAL).map((item) => (
                <ItemDirecto key={item.href!} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Por organización</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            <OrganizacionSwitcher />
            <SidebarMenu className="gap-1.5">
              {visibles(POR_ORGANIZACION).map((item) => (
                <ItemDirecto key={item.href!} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {rol === "admin" && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <ItemDirecto item={{ label: "Agentes V2 (avanzado)", href: "/agentes-v2", icon: Cpu }} pathname={pathname} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
