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
  Setting2,
  Profile2User,
  Monitor,
  ArrowLeft2,
  Chart,
  Cpu,
  Category2,
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
  { href: "/asistencia/admin/empleados", label: "Empleados", icon: Profile2User, soloSuperadmin: true },
  { href: "/asistencia/admin/horarios", label: "Horarios", icon: Setting2 },
  { href: "/asistencia/admin/vacaciones", label: "Vacaciones", icon: Airplane },
  { href: "/asistencia/admin/correcciones", label: "Correcciones", icon: Edit2 },
  { href: "/asistencia/admin/marcaciones-olvidadas", label: "Marcaciones olvidadas", icon: CalendarRemove },
  { href: "/asistencia/admin/ausencias-parciales", label: "Ausencias parciales", icon: Health },
  { href: "/asistencia/admin/auditoria", label: "Auditoría", icon: SecuritySafe },
  { href: "/asistencia/admin/informe", label: "Informe mensual", icon: DocumentDownload },
];

/** Entrada a la sección "Remote Work" — se renderiza aparte de
    ITEMS_ADMIN (no como una fila más de la lista) porque no es "una
    pantalla más de Administración": al entrar, cambia el sidebar entero
    (ver ES_RUTA_REMOTE_WORKERS más abajo). */
const ENTRADA_REMOTE_WORKERS = { href: "/asistencia/admin/remote-workers", label: "Remote Work", icon: Monitor };

/** Dentro de /asistencia/admin/remote-workers/*, el sidebar deja de
    mostrar Kiosco/Administración y muestra solo esto — es una sección
    dedicada a empleados remotos, con su propio dashboard y las mismas
    pantallas de solicitudes que ya existen en Administración
    (Fichajes/Vacaciones/Correcciones/Marcaciones olvidadas/Ausencias
    parciales), reutilizadas con un filtro "solo remotos" — no se crea
    ninguna tabla paralela. */
const ITEMS_REMOTE_WORKERS = [
  { href: "/asistencia/admin/remote-workers", label: "Dashboard", icon: Chart },
  { href: "/asistencia/admin/remote-workers/dispositivos", label: "Dispositivos", icon: Monitor },
  { href: "/asistencia/admin/remote-workers/agentes", label: "Agentes", icon: Cpu },
  { href: "/asistencia/admin/remote-workers/categorias", label: "Categorías", icon: Category2 },
  { href: "/asistencia/admin/remote-workers/fichajes", label: "Fichajes", icon: Clock },
  { href: "/asistencia/admin/remote-workers/vacaciones", label: "Vacaciones", icon: Airplane },
  { href: "/asistencia/admin/remote-workers/correcciones", label: "Correcciones", icon: Edit2 },
  { href: "/asistencia/admin/remote-workers/marcaciones-olvidadas", label: "Marcaciones olvidadas", icon: CalendarRemove },
  { href: "/asistencia/admin/remote-workers/ausencias-parciales", label: "Ausencias parciales", icon: Health },
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
        <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          Dashboard Asistencia
        </p>
      </SidebarHeader>
      <SidebarContent>
        {esManager && enRemoteWorkers ? (
          <SidebarGroup>
            <SidebarGroupLabel>Remote Work</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Volver a Asistencia" render={<Link href="/asistencia/admin/fichajes" />}>
                    <ArrowLeft2 />
                    <span>Volver a Asistencia</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {ITEMS_REMOTE_WORKERS.map((item) => {
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
        ) : (
          <>
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
                    {ITEMS_ADMIN.filter((item) => !item.soloSuperadmin || esSuperadmin(email)).map((item) => {
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
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive={false} tooltip={ENTRADA_REMOTE_WORKERS.label} render={<Link href={ENTRADA_REMOTE_WORKERS.href} />}>
                        <Monitor />
                        <span>{ENTRADA_REMOTE_WORKERS.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>
      <NavUser session={session} />
    </Sidebar>
  );
}
