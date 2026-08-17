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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowDown2 } from "@/lib/icons";
import type { Session } from "next-auth";
import { GRUPOS, GRUPO_ADMIN, type GrupoNavegacion, type ItemNavegacion } from "./navegacion";
import { NavUser } from "./nav-user";
import { esSuperadmin } from "@/lib/superadmin";

function ItemDirecto({ item, pathname }: { item: ItemNavegacion; pathname: string }) {
  const Icon = item.icon;
  if (!item.href) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled tooltip={item.label}>
          <Icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge className="text-[10px] text-sidebar-foreground/50">pronto</SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label} render={<Link href={item.href} />}>
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function GrupoColapsable({ grupo, pathname }: { grupo: GrupoNavegacion; pathname: string }) {
  const GrupoIcon = grupo.icon;
  return (
    // defaultOpen: los tres grupos empiezan desplegados — con 3-4 items cada
    // uno, ocultarlos de entrada solo añadiría un clic para llegar a algo
    // que antes estaba siempre a la vista.
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        {/* El encabezado de grupo solo alterna abierto/cerrado, no navega:
            un hover en azul sólido ahí sugiere una acción que no es tal.
            Se anula el hover heredado de sidebarMenuButtonVariants; el
            chevron ya avisa de que es interactivo. */}
        <SidebarMenuButton
          tooltip={grupo.titulo}
          className="hover:bg-transparent hover:text-sidebar-foreground"
          render={<CollapsibleTrigger className="group/trigger" />}
        >
          <GrupoIcon className="text-sidebar-primary" />
          <span>{grupo.titulo}</span>
          <ArrowDown2 className="ml-auto size-3.5 text-sidebar-foreground/50 transition-transform group-data-panel-open/trigger:rotate-180" />
        </SidebarMenuButton>
        <CollapsibleContent>
          {/* Indent algo más ajustado que el de shadcn (mx-3.5/px-2.5): a
              17rem de ancho, "Seguimiento de Facturas" se recortaba con el
              valor por defecto. La línea conectora va en azul de marca, no
              en el gris neutro por defecto. */}
          <SidebarMenuSub className="mx-2 gap-2.5 border-sidebar-primary/55 px-2">
            {grupo.items.map((item) => {
              const Icon = item.icon;
              if (!item.href) {
                return (
                  <SidebarMenuSubItem key={item.label}>
                    <SidebarMenuSubButton className="pointer-events-none opacity-60" aria-disabled>
                      <Icon />
                      <span>{item.label}</span>
                      <span className="ml-auto text-[10px] text-sidebar-foreground/50">pronto</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              }
              return (
                <SidebarMenuSubItem key={item.label}>
                  <SidebarMenuSubButton isActive={pathname === item.href} render={<Link href={item.href} />}>
                    <Icon />
                    <span>{item.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const grupos = esSuperadmin(session?.user?.email) ? [...GRUPOS, GRUPO_ADMIN] : GRUPOS;

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
                  <GrupoColapsable key={grupo.titulo} grupo={grupo} pathname={pathname} />
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
