import { AppSidebar } from "./sidebar";
import { Migas } from "./migas";
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
        {/* El botón de colapso vive dentro del propio panel lateral. */}
        <header className="flex h-14 items-center border-b bg-card px-4 shadow-sm">
          <Migas />
        </header>
        {/* El gris del fondo ya lo pone `body` (ver globals.css); este
            contenedor no necesita el suyo propio. */}
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
