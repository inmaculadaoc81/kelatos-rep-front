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
import { Message, Setting2, InfoCircle } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";

const GRUPOS: GrupoNavegacionBase[] = [
  {
    titulo: "Mensajes",
    icon: Message,
    items: [{ label: "Conversaciones", href: "/whatsapp/bandeja", icon: Message }],
  },
  {
    titulo: "Ajustes",
    icon: Setting2,
    items: [{ label: "Conexión con Chatwoot", href: "/whatsapp/conexion", icon: Setting2 }],
  },
  {
    titulo: "Ayuda",
    icon: InfoCircle,
    items: [{ label: "Cómo funciona", href: "/whatsapp/como-funciona", icon: InfoCircle }],
  },
];

/** Sidebar de WhatsApp — mismo esquema que Gestión MAILS (logo + trigger arriba, menú, NavUser abajo). */
export function WhatsappSidebar({ session }: { session: Session | null }) {
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
