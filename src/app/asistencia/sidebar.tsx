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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Clock,
  Calendar,
  ClipboardText,
  Airplane,
  Edit2,
  CalendarRemove,
  Health,
  SecuritySafe,
  DocumentDownload,
} from "@/lib/icons";
import { esSuperadmin } from "@/lib/superadmin";
import { NavUser } from "../(app)/nav-user";

const ITEMS_KIOSCO = [
  { href: "/asistencia/kiosk", label: "Fichar", icon: Clock },
  { href: "/asistencia/kiosk/mes", label: "Mi mes", icon: Calendar },
  { href: "/asistencia/kiosk/solicitudes", label: "Solicitudes", icon: ClipboardText },
];

const ITEMS_ADMIN = [
  { href: "/asistencia/admin/fichajes", label: "Fichajes", icon: Clock },
  { href: "/asistencia/admin/vacaciones", label: "Vacaciones", icon: Airplane },
  { href: "/asistencia/admin/correcciones", label: "Correcciones", icon: Edit2 },
  { href: "/asistencia/admin/marcaciones-olvidadas", label: "Marcaciones olvidadas", icon: CalendarRemove },
  { href: "/asistencia/admin/ausencias-parciales", label: "Ausencias parciales", icon: Health },
  { href: "/asistencia/admin/auditoria", label: "Auditoría", icon: SecuritySafe },
  { href: "/asistencia/admin/informe", label: "Informe mensual", icon: DocumentDownload },
];

/** Puerto del sidebar de la app (mismo componente Sidebar de shadcn ya
    usado en Reparaciones y Transferencias) — dos secciones que aparecen
    según lo que la cuenta pueda usar: "Kiosco" para cualquiera dado de
    alta como empleado que ficha, "Administración" solo para managers.
    Alguien puede ver ambas (p.ej. un admin @kelatos.com que también
    ficha él mismo). */
export function AsistenciaSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const email = session?.user?.email || "";
  const esManager = session?.user?.role === "admin" || esSuperadmin(email);
  const tieneKiosco = session?.user?.asistenciaEmpleadoId != null;

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
        <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          Dashboard Asistencia
        </p>
      </SidebarHeader>
      <SidebarContent>
        {tieneKiosco && (
          <SidebarGroup>
            <SidebarGroupLabel>Kiosco</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {ITEMS_KIOSCO.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label} render={<Link href={item.href} />}>
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {esManager && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {ITEMS_ADMIN.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label} render={<Link href={item.href} />}>
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
