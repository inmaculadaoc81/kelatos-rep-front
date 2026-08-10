import { auth, signOut } from "@/auth";
import { AppSidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Logout } from "@/lib/icons";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

// Redirect a /login DESACTIVADO TEMPORALMENTE (sin credenciales de Google
// OAuth todavía) — para reactivar, restaurar "if (!session?.user)
// redirect('/login')" antes del return.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="text-sm font-semibold text-primary">Kelatos — Dashboard</span>
          </div>
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
        <main className="flex-1 bg-muted/20">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
