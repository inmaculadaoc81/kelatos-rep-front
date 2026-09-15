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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { GrupoColapsable } from "@/components/sidebar-grupo-colapsable";
import { ArrowLeft2, Monitor } from "@/lib/icons";
import { esSuperadmin } from "@/lib/superadmin";
import { NavUser } from "../(app)/nav-user";
import { GRUPO_KIOSCO, GRUPO_ADMINISTRACION, GRUPO_REMOTE_WORK } from "./navegacion";

/** Puerto del sidebar de la app (mismo componente Sidebar de shadcn ya
    usado en Reparaciones y Transferencias) — dos secciones que aparecen
    según lo que la cuenta pueda usar: "Kiosco" para cualquiera dado de
    alta como empleado que ficha, "Administración" solo para managers.
    Alguien puede ver ambas (p.ej. un admin @kelatos.com que también
    ficha él mismo). Mismo patrón de grupos colapsables que Reparaciones
    (GrupoColapsable, ver src/components/sidebar-grupo-colapsable.tsx) —
    petición del usuario, 2026-09-15: "utiliza el mismo ui de reparaciones
    en el sidebar". */
export function AsistenciaSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const email = session?.user?.email || "";
  const esManager = session?.user?.role === "admin" || esSuperadmin(email);
  const tieneKiosco = session?.user?.asistenciaEmpleadoId != null;
  const enRemoteWorkers = pathname.startsWith("/asistencia/admin/remote-workers");

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
        {/* Conmutador de vista — arriba de todo, no como una fila más de
            ninguna lista: "Remote Work"/"Asistencia Local" no son
            pantallas, son las dos vistas completas entre las que se
            cambia (petición del usuario, 2026-09-15: antes "Remote Work"
            estaba enterrado al final de Administración y "Volver a
            Asistencia" al principio de Remote Work, como si fueran una
            opción más de cada lista). */}
        {esManager && (
          <SidebarGroup className="pb-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  {enRemoteWorkers ? (
                    <SidebarMenuButton tooltip="Asistencia Local" render={<Link href="/asistencia/admin/fichajes" />}>
                      <ArrowLeft2 />
                      <span className="font-medium">Asistencia Local</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton tooltip="Remote Work" render={<Link href="/asistencia/admin/remote-workers" />}>
                      <Monitor />
                      <span className="font-medium">Remote Work</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {esManager && enRemoteWorkers ? (
                <GrupoColapsable
                  titulo={GRUPO_REMOTE_WORK.titulo}
                  icon={GRUPO_REMOTE_WORK.icon}
                  items={GRUPO_REMOTE_WORK.items.filter((item) => !item.soloSuperadmin || esSuperadmin(email))}
                  pathname={pathname}
                />
              ) : (
                <>
                  {tieneKiosco && (
                    <GrupoColapsable titulo={GRUPO_KIOSCO.titulo} icon={GRUPO_KIOSCO.icon} items={GRUPO_KIOSCO.items} pathname={pathname} />
                  )}
                  {esManager && (
                    <GrupoColapsable
                      titulo={GRUPO_ADMINISTRACION.titulo}
                      icon={GRUPO_ADMINISTRACION.icon}
                      items={GRUPO_ADMINISTRACION.items.filter((item) => !item.soloSuperadmin || esSuperadmin(email))}
                      pathname={pathname}
                    />
                  )}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
