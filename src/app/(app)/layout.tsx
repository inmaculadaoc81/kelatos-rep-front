import { auth } from "@/auth";
import { esCuentaEmpleadosRestringida, esSuperadmin, puedeVerEfectivoSoloLectura } from "@/lib/superadmin";
import { AppSidebar } from "./sidebar";
import { Migas } from "./migas";
import { BuscadorGlobal } from "./buscador-global";
import { NavbarCodigoAcceso } from "./navbar-codigo-acceso";
import { NotificacionesBell } from "./notificaciones-bell";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { puedeUsarAsistente } from "@/lib/asistente/permisos";
import { puedeVerEquiposEntregados } from "@/lib/equipos-entregados";
import { CodigoAccesoProvider } from "./codigo-acceso-context";
import { EscanerCodigoBarras } from "./escaner-codigo-barras";
import { AsistenteFlotante } from "./asistente-flotante";

// El redirect a /login ya lo hace proxy.ts a nivel de middleware para
// todas las rutas de este grupo — aquí solo se lee la sesión para pasar
// el usuario real al pie del sidebar (nav-user.tsx).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <CodigoAccesoProvider>
      <EscanerCodigoBarras recepcionEquipos={!!session?.user?.email && !esCuentaEmpleadosRestringida(session.user.email)} />
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset>
          {/* sticky: se queda fijo arriba al hacer scroll en vez de
              desaparecer con el contenido. El botón de colapso vive dentro
              del propio panel lateral. */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 bg-primary px-4 shadow-sm">
            <Migas />
            <div className="mx-auto hidden w-full max-w-sm sm:block">
              <BuscadorGlobal
                esAdmin={session?.user?.role === "admin" || esSuperadmin(session?.user?.email)}
                efectivoSoloLectura={puedeVerEfectivoSoloLectura(session?.user?.email)}
                equiposEntregados={puedeVerEquiposEntregados(session?.user)}
              />
            </div>
            <div className="flex items-center gap-2">
              <NotificacionesBell />
              <NavbarCodigoAcceso />
            </div>
          </header>
          {/* El gris del fondo ya lo pone `body` (ver globals.css); este
              contenedor no necesita el suyo propio. */}
          <main className="flex-1">{children}</main>
          {/* Quién lo ve: ver puedeUsarAsistente (superadmins y la cuenta soporte); las rutas /api/asistente lo exigen también. */}
          {puedeUsarAsistente(session?.user) && <AsistenteFlotante />}
        </SidebarInset>
      </SidebarProvider>
    </CodigoAccesoProvider>
  );
}
