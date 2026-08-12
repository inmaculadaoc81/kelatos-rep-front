"use client";

import { useTransition } from "react";
import type { Session } from "next-auth";
import { MoreCircle, Profile, Setting2, Logout, ShieldTick } from "@/lib/icons";
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
import { cerrarSesion } from "./acciones";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function NavUser({ session }: { session: Session | null }) {
  const { isMobile } = useSidebar();
  const [cerrando, startTransition] = useTransition();

  const nombre = session?.user?.name || session?.user?.email || "Usuario";
  const email = session?.user?.email || "";
  const esAdmin = session?.user?.role === "admin";

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <SidebarMenuButton
              size="lg"
              tooltip={nombre}
              className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
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
              side={isMobile ? "bottom" : "top"}
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
              <DropdownMenuSeparator />
              {/* Sin conectar todavía — el resto del sistema usa el mismo
                  patrón "pronto" para módulos aún no construidos. */}
              <DropdownMenuItem disabled>
                <Profile /> Mi perfil
                <span className="ml-auto text-[10px] text-muted-foreground">pronto</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Setting2 /> Configuración
                <span className="ml-auto text-[10px] text-muted-foreground">pronto</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={cerrando}
                onClick={() => startTransition(() => cerrarSesion())}
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
