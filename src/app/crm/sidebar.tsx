"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { BookOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ItemDirecto, GrupoColapsable, type GrupoNavegacionBase, type ItemNavegacionBase } from "@/components/sidebar-grupo-colapsable";
import { ClipboardText, Chart, Category, Message, Call, Global, Sms, Profile2User } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";

// Mismo patrón que Reparaciones: un grupo con varios hijos se despliega; con uno solo es un enlace directo.
const PANEL: ItemNavegacionBase = { label: "Panel", href: "/crm", icon: Category, exacto: true };
const GRUPO_LEADS: GrupoNavegacionBase = {
  titulo: "Leads por canal",
  icon: Profile2User,
  items: [
    { label: "WhatsApp", href: "/crm/whatsapp", icon: Message },
    { label: "Llamadas", href: "/crm/llamadas", icon: Call },
    { label: "Web y citas", href: "/crm/web", icon: Global },
    { label: "Correo", href: "/crm/correo", icon: Sms },
    { label: "Todos los leads", href: "/crm/lista", icon: ClipboardText },
  ],
};
const METRICAS: ItemNavegacionBase = { label: "Métricas", href: "/crm/metricas", icon: Chart };
const AYUDA: ItemNavegacionBase = { label: "Cómo funciona", href: "/crm/como-funciona", icon: BookOpen };

/** Mismo esqueleto (logo + NavUser) que Tareas/Webs Kelatos. */
export function CrmSidebar({ session }: { session: Session | null }) {
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
              <ItemDirecto item={PANEL} pathname={pathname} />
              <GrupoColapsable titulo={GRUPO_LEADS.titulo} icon={GRUPO_LEADS.icon} items={GRUPO_LEADS.items} pathname={pathname} />
              <ItemDirecto item={METRICAS} pathname={pathname} />
              <ItemDirecto item={AYUDA} pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
