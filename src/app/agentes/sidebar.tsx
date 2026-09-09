"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserSearch, Cpu } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentType } from "@/lib/agentes";
import { NavUser } from "../(app)/nav-user";

// Un icono por tipo de agente conocido por el frontend; cualquier tipo
// nuevo que el backend liste y que este mapa no reconozca aún cae en el
// icono genérico Cpu — así la lista nunca queda vacía por un tipo sin
// mapear todavía.
const ICONO_POR_TIPO: Record<string, typeof UserSearch> = {
  lead_research: UserSearch,
};

/** Sidebar de la plataforma de Agentes IA — lista plana de tipos de
    agente (hoy solo uno), pensada para crecer sin cambios de estructura:
    la metadata viene de GET /v1/agentes/tipos, no está hardcodeada aquí. */
export function AgentesSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [tipos, setTipos] = useState<AgentType[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/agentes/tipos")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setTipos(data.tipos as AgentType[]);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

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
          <SidebarGroupLabel className="flex items-center gap-2 text-sidebar-foreground">
            <Cpu className="size-4 text-sidebar-primary" />
            <span>Agentes</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cargando && (
                <div className="space-y-1.5 px-2 py-1">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              )}
              {!cargando && tipos.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                  Sin agentes todavía
                </p>
              )}
              <SidebarMenuSub className="mx-0 gap-1.5 border-none px-0">
                {tipos.map((tipo) => {
                  const href = `/agentes/${tipo.type}`;
                  const Icono = ICONO_POR_TIPO[tipo.type] || Cpu;
                  return (
                    <SidebarMenuSubItem key={tipo.type}>
                      <SidebarMenuSubButton isActive={pathname?.startsWith(href) ?? false} render={<Link href={href} />}>
                        <Icono />
                        <span className="truncate">{tipo.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
