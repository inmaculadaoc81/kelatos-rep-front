"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { MoreCircle, Profile, Setting2, Logout, ShieldTick, ArrowSwapHorizontal, Clock, ClipboardTick, ClipboardText, Global, Cpu, Sms, SecuritySafe, Video } from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { esSuperadmin, puedeVerTransferencias } from "@/lib/superadmin";
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
  // Cuenta de "2 puertas" (migración 160, ver src/auth.ts) — acceso total al
  // dashboard pero SIN rol admin/superadmin. Petición del usuario, 2026-09-30
  // (soporte@kelatos.com): sin acceso a Tareas, pero SÍ a Gestión MAILS (con
  // una vista restringida propia — ver mails-related components).
  const accesoCompleto = !!session?.user?.accesoCompleto;
  const muestraTransferencias = puedeVerTransferencias(email);
  const puedeVerAsistencia = esAdmin || esSuperadmin(email);
  // Un empleado que solo ficha no tiene acceso a nada fuera de /asistencia
  // — "Mi perfil", "Configuración" y los botones de cambiar de dashboard no
  // le sirven de nada (proxy.ts lo rebotaría de vuelta al kiosco), así que
  // se ocultan para esa cuenta. MISMA fórmula que esSoloAsistencia en
  // src/proxy.ts (la que de verdad bloquea el acceso) — una versión más
  // simple aquí (sin viaCredentials/accesoCompleto) dejaba visibles
  // "Reparaciones"/"Tareas" para una cuenta de kiosco con email @kelatos.com
  // vía Credentials (p. ej. Jeannie): el dominio por sí solo no basta,
  // porque Credentials existe precisamente para empleados con un email con
  // forma @kelatos.com que NO deben tratarse como cuenta del dominio (bug
  // real reportado 2026-10-07).
  const esSoloAsistencia = session?.user?.asistenciaEmpleadoId != null &&
    !session?.user?.accesoCompleto &&
    (!!session?.user?.viaCredentials || !esDominioKelatos(email));
  // Este componente se reutiliza en el sidebar de Transferencias — el
  // enlace de cambio de dashboard debe apuntar siempre al OTRO, no siempre
  // a Transferencias.
  const enTransferencias = pathname?.startsWith("/transferencias") ?? false;
  const enAsistencia = pathname?.startsWith("/asistencia") ?? false;
  const enWebsKelatos = pathname?.startsWith("/webs-kelatos") ?? false;
  const enAgentesV2 = pathname?.startsWith("/agentes-v2") ?? false;
  const enAgentes = (pathname?.startsWith("/agentes") ?? false) && !enAgentesV2;
  const enMails = pathname?.startsWith("/mails") ?? false;
  const enTareas = pathname?.startsWith("/tareas") ?? false;
  const enContenido = pathname?.startsWith("/asistencia/contenido") ?? false;
  const enReparaciones = !enTransferencias && !enAsistencia && !enWebsKelatos && !enAgentes && !enAgentesV2 && !enMails && !enTareas;
  const puedeVerWebsKelatos = esAdmin || esSuperadmin(email);
  const puedeVerAgentes = esAdmin || esSuperadmin(email);
  // accesoCompleto ve Gestión MAILS, pero con una vista restringida a solo
  // "Centro de mails" y su propio buzón — ver GestionMailsSidebar.
  const puedeVerMails = esAdmin || esSuperadmin(email) || accesoCompleto;

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
              sideOffset={12}
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
              {/* Un botón por dashboard, oculto cuando ya estás en él — en vez
                  de reetiquetar el botón activo como "Reparaciones", cada uno
                  desaparece por su cuenta y Reparaciones tiene su propia
                  entrada (oculta solo cuando ya estás ahí). Petición del
                  usuario, 2026-09-09: "para cada vista su respectivo botón
                  que no salga". */}
              {!esSoloAsistencia && !enReparaciones && (
                <DropdownMenuItem render={<Link href="/" />}>
                  <IconoDashboard icon={ClipboardTick} className="from-amber-500 to-orange-600" />
                  Reparaciones
                </DropdownMenuItem>
              )}
              {!esSoloAsistencia && !enTareas && !accesoCompleto && (
                <DropdownMenuItem render={<Link href="/tareas" />}>
                  <IconoDashboard icon={ClipboardText} className="from-fuchsia-500 to-purple-600" />
                  Tareas
                </DropdownMenuItem>
              )}
              {muestraTransferencias && !enTransferencias && (
                <DropdownMenuItem render={<Link href="/transferencias" />}>
                  <IconoDashboard icon={ArrowSwapHorizontal} className="from-sky-500 to-blue-600" />
                  Transferencias
                </DropdownMenuItem>
              )}
              {puedeVerAsistencia && !enAsistencia && (
                <DropdownMenuItem render={<Link href="/asistencia" />}>
                  <IconoDashboard icon={Clock} className="from-violet-500 to-purple-600" />
                  Asistencias
                </DropdownMenuItem>
              )}
              {puedeVerWebsKelatos && !enWebsKelatos && (
                <DropdownMenuItem render={<Link href="/webs-kelatos" />}>
                  <IconoDashboard icon={Global} className="from-emerald-500 to-green-600" />
                  Webs Kelatos
                </DropdownMenuItem>
              )}
              {puedeVerAgentes && !enAgentes && (
                <DropdownMenuItem render={<Link href="/agentes" />}>
                  <IconoDashboard icon={SecuritySafe} className="from-cyan-500 to-teal-600" />
                  Seguridad
                </DropdownMenuItem>
              )}
              {puedeVerAgentes && !enAgentesV2 && (
                <DropdownMenuItem render={<Link href="/agentes-v2" />}>
                  <IconoDashboard icon={Cpu} className="from-indigo-500 to-blue-600" />
                  Agentes V2
                </DropdownMenuItem>
              )}
              {puedeVerMails && !enMails && (
                <DropdownMenuItem render={<Link href="/mails" />}>
                  <IconoDashboard icon={Sms} className="from-rose-500 to-pink-600" />
                  Gestión MAILS
                </DropdownMenuItem>
              )}
              {/* Panel de contenido de la community manager — antes solo
                  accesible por URL directa o para una única cuenta admin
                  (ver lib/contenido-acceso.ts); ampliado a cualquier admin
                  y enlazado aquí, petición del usuario, 2026-10-07. */}
              {esAdmin && !enContenido && (
                <DropdownMenuItem render={<Link href="/asistencia/contenido" />}>
                  <IconoDashboard icon={Video} className="from-pink-500 to-fuchsia-600" />
                  Contenido
                </DropdownMenuItem>
              )}
              {/* Vuelta al kiosco de fichaje desde Contenido — antes era un
                  icono suelto en ContenidoHeader; petición del usuario,
                  2026-10-07: tiene que estar aquí, igual que el resto de
                  botones de cambiar de dashboard. Fuera de los `!esSoloAsistencia`
                  de arriba a propósito: Jeannie (cuenta solo-asistencia) es
                  quien más lo necesita, para volver de Contenido al kiosco. */}
              {enContenido && (
                <DropdownMenuItem render={<Link href="/asistencia/kiosk" />}>
                  <IconoDashboard icon={Clock} className="from-emerald-500 to-teal-600" />
                  Fichaje
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
