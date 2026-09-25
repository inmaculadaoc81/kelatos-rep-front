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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Category } from "@/lib/icons";
import type { DepartamentoResumen } from "@/lib/agentes-v2";
import { NavUser } from "../(app)/nav-user";
import { GRUPOS_ANTES, GRUPOS_DESPUES, ICONO_DEPARTAMENTO, type GrupoNav } from "./navegacion";

function Grupo({ grupo, pathname, pendientes = 0 }: { grupo: GrupoNav; pathname: string; pendientes?: number }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/60">{grupo.titulo}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {grupo.items.map((it) => {
            const activo = it.href === "/agentes-v2" ? pathname === it.href : pathname.startsWith(it.href);
            return (
              <SidebarMenuItem key={it.href}>
                <SidebarMenuButton isActive={activo} tooltip={it.label} render={<Link href={it.href} />}>
                  <it.icon />
                  <span>{it.label}</span>
                  {it.href === "/agentes-v2/aprobaciones" && pendientes > 0 && (
                    <span className="ml-auto rounded-full bg-amber-500 px-1.5 text-[10px] leading-4 font-semibold text-white group-data-[collapsible=icon]:hidden">{pendientes}</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** Sidebar de Agentes V2: orientado al negocio (marketing), no a la infraestructura de agentes.
    Los departamentos se cargan de la base de datos: añadir uno nuevo no requiere tocar este archivo. */
export function AgentesV2Sidebar({ session }: { session: Session | null }) {
  const pathname = usePathname() || "";
  const [departamentos, setDepartamentos] = useState<DepartamentoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pendientes, setPendientes] = useState(0);

  // Número de aprobaciones pendientes: se refresca al cambiar de pantalla (p. ej. tras decidir una).
  useEffect(() => {
    fetch("/api/agentes-v2/approvals?status=pending_approval", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPendientes(Number(data.counts?.pending_approval) || 0);
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    fetch("/api/agentes-v2/departments", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setDepartamentos(data.departments as DepartamentoResumen[]);
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
            <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            <Image src="/logos/kelatos-icono.png" alt="Kelatos" width={81} height={82} priority unoptimized className="hidden h-7 w-auto shrink-0 group-data-[collapsible=icon]:block" />
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {GRUPOS_ANTES.map((g) => (
          <Grupo key={g.titulo} grupo={g} pathname={pathname} />
        ))}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Departamentos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cargando && (
                <div className="space-y-1.5 px-2 py-1">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              )}
              {departamentos.map((d) => {
                const href = `/agentes-v2/departamentos/${d.key}`;
                const Icono = ICONO_DEPARTAMENTO[d.icon] || Category;
                return (
                  <SidebarMenuItem key={d.key}>
                    <SidebarMenuButton isActive={pathname.startsWith(href)} tooltip={d.name} render={<Link href={href} />}>
                      <Icono />
                      <span className="truncate">{d.name}</span>
                      <span
                        className={`ml-auto size-1.5 shrink-0 rounded-full group-data-[collapsible=icon]:hidden ${d.status === "active" ? "bg-green-500" : d.status === "paused" ? "bg-amber-500" : "bg-sidebar-foreground/25"}`}
                        title={d.status === "active" ? "Activo" : d.status === "paused" ? "En pausa" : "Sin activar"}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {GRUPOS_DESPUES.map((g) => (
          <Grupo key={g.titulo} grupo={g} pathname={pathname} pendientes={pendientes} />
        ))}
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
