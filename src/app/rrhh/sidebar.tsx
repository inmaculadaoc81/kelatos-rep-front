"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Sms, Notification, Profile2User, Clock } from "@/lib/icons";
import { NavUser } from "../(app)/nav-user";

/** Mismo esqueleto que las demás vistas (logo, menú y usuario). `conFichaje`: quien ficha vuelve desde aquí. */
export function RrhhSidebar({ session, esRrhh, conFichaje }: { session: Session | null; esRrhh: boolean; conFichaje: boolean }) {
  const pathname = usePathname();
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    fetch("/api/rrhh/yo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPendientes(Math.max(d.pendientes.sin_leer, d.pendientes.sin_conformidad)); })
      .catch(() => {});
  }, [pathname]);

  const vistas = [
    { href: "/rrhh/correo", etiqueta: "Mi correo", icono: Sms, aviso: 0 },
    { href: "/rrhh/comunicados", etiqueta: "Comunicados", icono: Notification, aviso: pendientes },
    ...(esRrhh ? [{ href: "/rrhh/gestion", etiqueta: "Gestión de RRHH", icono: Profile2User, aviso: 0 }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link
            href="/"
            className="flex h-10 items-center rounded-md bg-white px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
            aria-label="Volver al inicio"
          >
            <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            <Image src="/logos/kelatos-icono.png" alt="Kelatos" width={81} height={82} priority unoptimized className="hidden h-7 w-auto shrink-0 group-data-[collapsible=icon]:block" />
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recursos Humanos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {vistas.map((v) => (
                <SidebarMenuItem key={v.href}>
                  <SidebarMenuButton isActive={pathname === v.href} tooltip={v.etiqueta} render={<Link href={v.href} />}>
                    <v.icono className="text-sidebar-primary" />
                    <span>{v.etiqueta}</span>
                  </SidebarMenuButton>
                  {v.aviso > 0 && <SidebarMenuBadge className="rounded-full bg-destructive px-1.5 text-white">{v.aviso}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {conFichaje && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Fichaje" render={<Link href="/asistencia/kiosk" />}>
                    <Clock className="text-sidebar-primary" />
                    <span>Fichaje</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
