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
import type { ComponentType } from "react";
import type { IconProps } from "iconsax-react";
import { Cpu, SecuritySafe, Video } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentType, hrefParaTipoAgente } from "@/lib/agentes";
import { NavUser } from "../(app)/nav-user";

// Este módulo era una plataforma genérica de varios tipos de agente
// (Lead Research, Equipo de Marketing IA, LinkedIn) — se reserva ahora
// para los agentes "operativos" (Auditoría de Seguridad, SEO de vídeo;
// petición del usuario, 2026-10-01 y 2026-10-03). Los demás tipos NO se
// borran (sus campañas/leads/runs siguen en la base de datos, accesibles
// si se visita su URL directamente) — solo se ocultan de aquí: se filtra
// la lista que ya devuelve el backend en vez de dejar de pedirla, así que
// si algún día se quiere recuperar la vista genérica basta con quitar
// este filtro.
const TIPOS_VISIBLES = new Set(["security_audit", "video_seo"]);

// Icono por tipo — antes era SecuritySafe fijo para todos, válido mientras
// solo hubiera un agente en este módulo. Con dos agentes de naturaleza
// distinta hace falta distinguirlos; SecuritySafe de respaldo para un tipo
// nuevo sin icono propio todavía.
const ICONO_POR_TIPO: Record<string, ComponentType<IconProps>> = {
  security_audit: SecuritySafe,
  video_seo: Video,
};

export function AgentesSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [tipos, setTipos] = useState<AgentType[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/agentes/tipos")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setTipos((data.tipos as AgentType[]).filter((t) => TIPOS_VISIBLES.has(t.type)));
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
                </div>
              )}
              <SidebarMenuSub className="mx-0 gap-1.5 border-none px-0">
                {tipos.map((tipo) => {
                  const href = hrefParaTipoAgente(tipo.type);
                  const Icono = ICONO_POR_TIPO[tipo.type] || SecuritySafe;
                  return (
                    <SidebarMenuSubItem key={tipo.type}>
                      <SidebarMenuSubButton isActive={pathname?.startsWith(href) ?? false} render={<Link href={href} />}>
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${tipo.activo ? "bg-blue-500" : "bg-sidebar-foreground/25"}`}
                          title={tipo.activo ? "Con un run en curso" : "Sin actividad ahora mismo"}
                        />
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
