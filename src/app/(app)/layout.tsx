import { AppSidebar } from "./sidebar";
import { Migas } from "./migas";
import { BuscadorGlobal } from "./buscador-global";
import { NavbarCodigoAcceso } from "./navbar-codigo-acceso";
import { NotificacionesBell } from "./notificaciones-bell";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

// Redirect a /login DESACTIVADO TEMPORALMENTE (sin credenciales de Google
// OAuth todavía) — para reactivar, restaurar "if (!session?.user)
// redirect('/login')" antes del return. El bloque de usuario/cerrar sesión
// que iba aquí se movió al pie del sidebar (nav-user.tsx).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* sticky: se queda fijo arriba al hacer scroll en vez de
            desaparecer con el contenido. El botón de colapso vive dentro
            del propio panel lateral. */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 bg-primary px-4 shadow-sm">
          <Migas />
          <div className="mx-auto hidden w-full max-w-sm sm:block">
            <BuscadorGlobal />
          </div>
          <div className="flex items-center gap-2">
            <NotificacionesBell />
            <NavbarCodigoAcceso />
          </div>
        </header>
        {/* El gris del fondo ya lo pone `body` (ver globals.css); este
            contenedor no necesita el suyo propio. */}
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
