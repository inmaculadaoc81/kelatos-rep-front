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
import { Sms, Setting2, Building, CloseCircle, Send2, Magicpen, Flash, Edit2, SecuritySafe, Video, Microphone } from "@/lib/icons";
import { esSuperadmin } from "@/lib/superadmin";
import { NavUser } from "../(app)/nav-user";

const GRUPOS: GrupoNavegacionBase[] = [
  {
    titulo: "Correo",
    icon: Sms,
    items: [
      { label: "Centro de mails", href: "/mails/bandeja", icon: Sms },
      { label: "Buzones", href: "/mails/buzones", icon: Setting2 },
    ],
  },
  {
    titulo: "Automatización",
    icon: Flash,
    items: [
      { label: "Respuestas a presupuestos", href: "/mails/respuestas", icon: Flash },
      { label: "Respuestas a formularios", href: "/mails/formularios", icon: Edit2 },
    ],
  },
  {
    titulo: "Direcciones",
    icon: Building,
    items: [
      { label: "Direcciones inválidas", href: "/mails/direcciones", icon: CloseCircle },
    ],
  },
  {
    titulo: "Agente de leads",
    icon: Magicpen,
    items: [{ label: "Campañas", href: "/mails/agente-leads", icon: Magicpen }],
  },
  {
    titulo: "Envíos",
    icon: Send2,
    items: [{ label: "Tipos de correo", href: "/mails/tipos", icon: Send2 }],
  },
];

/** Los agentes operativos (antes en «Seguridad»): solo superadmins. */
const GRUPO_AGENTES: GrupoNavegacionBase = {
  titulo: "Agentes",
  icon: SecuritySafe,
  items: [
    { label: "Auditoría de seguridad", href: "/mails/agentes/security_audit", icon: SecuritySafe },
    { label: "SEO de vídeo", href: "/mails/agentes/video_seo", icon: Video },
    { label: "Oportunidades de PR", href: "/mails/agentes/pr_opportunities", icon: Microphone },
  ],
};

// Una cuenta accesoCompleto (migración 160, p.ej. soporte@kelatos.com) ve una
// vista recortada: solo "Centro de mails", nada de Buzones/Leads/Direcciones
// inválidas/Tipos de correo. Petición del usuario, 2026-09-30.
const GRUPOS_RECORTADOS: GrupoNavegacionBase[] = [
  { titulo: "Correo", icon: Sms, items: [{ label: "Centro de mails", href: "/mails/bandeja", icon: Sms }] },
];

/** Sidebar de Gestión MAILS — mismo esquema que el de Agentes (logo +
    trigger arriba, menú, NavUser abajo). */
export function MailsSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const grupos = session?.user?.accesoCompleto ? GRUPOS_RECORTADOS : esSuperadmin(session?.user?.email) ? [...GRUPOS, GRUPO_AGENTES] : GRUPOS;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link
            href="/"
            className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
            aria-label="Volver a Reparaciones"
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
