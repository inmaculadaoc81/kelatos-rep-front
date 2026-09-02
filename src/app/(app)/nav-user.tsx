"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { MoreCircle, Profile, Setting2, Logout, ShieldTick, ArrowSwapHorizontal, Clock } from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { esSuperadmin } from "@/lib/superadmin";
import { esDominioKelatos } from "@/lib/dominio-kelatos";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function IconoDashboard({ icon: IconComp, className }: { icon: Icon; className: string }) {
  return (
    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-white ${className}`}>
      <IconComp className="size-3.5" />
    </span>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function NavUser({ session }: { session: Session | null }) {
  const { isMobile } = useSidebar();
  const [cerrando, setCerrando] = useState(false);
  const pathname = usePathname();

  const nombre = session?.user?.name || session?.user?.email || "Usuario";
  const email = session?.user?.email || "";
  const esAdmin = session?.user?.role === "admin";
  const puedeVerTransferencias = esSuperadmin(email);
  const puedeVerAsistencia = esAdmin || esSuperadmin(email);
  // Un empleado que solo ficha (sin cuenta @kelatos.com, ver src/auth.ts)
  // no tiene acceso a nada fuera de /asistencia — "Mi perfil" y
  // "Configuración" no le sirven de nada (proxy.ts lo rebotaría de vuelta
  // al kiosco), así que se ocultan para esa cuenta.
  const esSoloAsistencia = session?.user?.asistenciaEmpleadoId != null && !esDominioKelatos(email);
  // Este componente se reutiliza en el sidebar de Transferencias — el
  // enlace de cambio de dashboard debe apuntar siempre al OTRO, no siempre
  // a Transferencias.
  const enTransferencias = pathname?.startsWith("/transferencias") ?? false;
  const enAsistencia = pathname?.startsWith("/asistencia") ?? false;

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <SidebarMenuButton
              size="lg"
              tooltip={nombre}
              className="data-popup-open:bg-sidebar-primary/15 data-popup-open:text-sidebar-primary"
              render={<DropdownMenuTrigger />}
            >
              <Avatar size="sm" className="rounded-md">
                <AvatarFallback className="rounded-md bg-sidebar-primary/12 text-sidebar-primary">
                  {iniciales(nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{nombre}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">{email}</span>
              </div>
              <MoreCircle className="ml-auto size-4 text-sidebar-foreground/50" />
            </SidebarMenuButton>
            <DropdownMenuContent
              className="min-w-56"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              {/* MenuPrimitive.GroupLabel (base-ui) exige un Menu.Group como
                  ancestro — a diferencia de Radix, donde el Label suelto
                  funciona sin envoltorio. */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="grid gap-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{nombre}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                    <Badge variant={esAdmin ? "default" : "secondary"} className="mt-0.5 w-fit gap-1 text-[10px]">
                      <ShieldTick className="size-3" /> {esAdmin ? "Administrador" : "Usuario"}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              {!esSoloAsistencia && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/mi-perfil" />}>
                    <Profile /> Mi perfil
                  </DropdownMenuItem>
                  {esAdmin ? (
                    <DropdownMenuItem render={<Link href="/configuracion" />}>
                      <Setting2 /> Configuración
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled>
                      <Setting2 /> Configuración
                      <span className="ml-auto text-[10px] text-muted-foreground">pronto</span>
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {puedeVerTransferencias && (
                <DropdownMenuItem render={<Link href={enTransferencias ? "/" : "/transferencias"} />}>
                  <IconoDashboard icon={ArrowSwapHorizontal} className="from-sky-500 to-blue-600" />
                  {enTransferencias ? "Reparaciones" : "Transferencias"}
                </DropdownMenuItem>
              )}
              {puedeVerAsistencia && (
                <DropdownMenuItem render={<Link href={enAsistencia ? "/" : "/asistencia"} />}>
                  <IconoDashboard icon={Clock} className="from-violet-500 to-purple-600" />
                  {enAsistencia ? "Reparaciones" : "Asistencias"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={cerrando}
                onClick={() => { setCerrando(true); signOut({ redirectTo: "/login" }); }}
              >
                <Logout /> {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
