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
  DocumentText,
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
  { href: "/asistencia/admin/remote-workers/reportes", label: "Reportes", icon: DocumentText },
  // Empleados SÍ se filtra ahora ("solo remotos", ver empleados-view.tsx
  // con soloRemotos) -- antes enlazaba directo a Administración y sacaba
  // de esta sección sin avisar, mostrando además a TODOS los empleados
  // (petición del usuario, 2026-09-15). Horarios sigue sin filtrar: no
  // hay concepto de "horario remoto", es el mismo calendario para todos.
  { href: "/asistencia/admin/remote-workers/empleados", label: "Empleados", icon: Profile2User, soloSuperadmin: true },
  { href: "/asistencia/admin/horarios", label: "Horarios", icon: Setting2 },
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

        {esManager && enRemoteWorkers ? (
          <SidebarGroup>
            <SidebarGroupLabel>Remote Work</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {ITEMS_REMOTE_WORKERS.filter((item) => !item.soloSuperadmin || esSuperadmin(email)).map((item) => {
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
