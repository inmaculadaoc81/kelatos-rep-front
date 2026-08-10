import { auth, signOut } from "@/auth";
import { AppSidebar } from "./sidebar";
import { Migas } from "./migas";
import { Button } from "@/components/ui/button";
import { Logout } from "@/lib/icons";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

// Redirect a /login DESACTIVADO TEMPORALMENTE (sin credenciales de Google
// OAuth todavía) — para reactivar, restaurar "if (!session?.user)
// redirect('/login')" antes del return.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* El botón de colapso vive ahora dentro del propio panel lateral. */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
          <Migas />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session?.user?.email || "sin sesión (auth desactivada)"}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="ghost" size="icon-sm" title="Cerrar sesión">
                <Logout className="size-4" />
              </Button>
            </form>
          </div>
        </header>
        {/* El gris del fondo ya lo pone `body` (ver globals.css); este
            contenedor no necesita el suyo propio. */}
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
