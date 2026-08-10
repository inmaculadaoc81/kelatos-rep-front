"use client";

import { useTransition } from "react";
import { MoreCircle, Profile, Setting2, Logout } from "@/lib/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

// Placeholder estático hasta que haya credenciales de Google OAuth y el
// login quede activo (ver layout.tsx) — entonces esto se sustituye por la
// sesión real (auth()/useSession). Cerrar sesión sí es funcional ya.
const USUARIO_ESTATICO = {
  nombre: "Usuario Kelatos",
  email: "usuario@kelatos.com",
  iniciales: "UK",
};

export function NavUser() {
  const { isMobile } = useSidebar();
  const [cerrando, startTransition] = useTransition();

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <SidebarMenuButton
              size="lg"
              tooltip={USUARIO_ESTATICO.nombre}
              className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              render={<DropdownMenuTrigger />}
            >
              <Avatar size="sm" className="rounded-md">
                <AvatarFallback className="rounded-md bg-sidebar-primary/12 text-sidebar-primary">
                  {USUARIO_ESTATICO.iniciales}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{USUARIO_ESTATICO.nombre}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">{USUARIO_ESTATICO.email}</span>
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
                  <div className="grid text-left leading-tight">
                    <span className="truncate text-sm font-medium">{USUARIO_ESTATICO.nombre}</span>
                    <span className="truncate text-xs text-muted-foreground">{USUARIO_ESTATICO.email}</span>
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
