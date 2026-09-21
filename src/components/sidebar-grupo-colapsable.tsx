"use client";

import Link from "next/link";
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowDown2 } from "@/lib/icons";

export interface ItemNavegacionBase {
  label: string;
  /** `null` = todavía no construido / sin enlace propio (se pinta "pronto"). */
  href: string | null;
  icon: React.ElementType;
  /** Clases opcionales para destacar un item (p. ej. texto en verde). */
  claseColor?: string;
}

export interface GrupoNavegacionBase {
  titulo: string;
  /** Icono del encabezado — solo se pinta cuando el grupo tiene más de un item. */
  icon: React.ElementType;
  items: ItemNavegacionBase[];
}

/**
 * Mismo patrón de sidebar en toda la app (Reparaciones, Asistencia): un
 * grupo con un solo item se pinta como enlace directo (sin desplegable, un
 * clic de más para llegar al mismo sitio); con varios, como grupo
 * colapsable con cabecera + chevron. Extraído de src/app/(app)/sidebar.tsx
 * (2026-09-15) para reutilizarlo en Asistencia sin duplicar el patrón.
 */
export function ItemDirecto({ item, pathname }: { item: ItemNavegacionBase; pathname: string }) {
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

export function GrupoColapsable({
  titulo,
  icon: GrupoIcon,
  items,
  pathname,
  defaultOpen = true,
}: {
  titulo: string;
  icon: React.ElementType;
  items: ItemNavegacionBase[];
  pathname: string;
  defaultOpen?: boolean;
}) {
  return (
    // defaultOpen: los grupos empiezan desplegados — ocultarlos de entrada
    // solo añadiría un clic para llegar a algo que antes estaba siempre a
    // la vista.
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarMenuItem>
        {/* El encabezado de grupo solo alterna abierto/cerrado, no navega:
            un hover en azul sólido ahí sugiere una acción que no es tal.
            Se anula el hover heredado de sidebarMenuButtonVariants; el
            chevron ya avisa de que es interactivo. */}
        <SidebarMenuButton
          tooltip={titulo}
          className="hover:bg-transparent hover:text-sidebar-foreground"
          render={<CollapsibleTrigger className="group/trigger" />}
        >
          <GrupoIcon className="text-sidebar-primary" />
          <span>{titulo}</span>
          <ArrowDown2 className="ml-auto size-3.5 text-sidebar-foreground/50 transition-transform group-data-panel-open/trigger:rotate-180" />
        </SidebarMenuButton>
        <CollapsibleContent>
          {/* Indent algo más ajustado que el de shadcn (mx-3.5/px-2.5): a
              17rem de ancho, las etiquetas más largas se recortaban con el
              valor por defecto. La línea conectora va en azul de marca, no
              en el gris neutro por defecto. */}
          <SidebarMenuSub className="mx-2 gap-2.5 border-sidebar-primary/55 px-2">
            {items.map((item) => {
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
                  <SidebarMenuSubButton isActive={pathname === item.href} className={item.claseColor} render={<Link href={item.href} />}>
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
