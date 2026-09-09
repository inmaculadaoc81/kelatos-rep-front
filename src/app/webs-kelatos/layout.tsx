import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { WebsKelatosSidebar } from "./sidebar";
import { WebsKelatosHeader } from "./header";

// Dashboard aparte (como Transferencias), fuera de (app)/ — petición del
// usuario, 2026-09-09. Acceso: administradores y superadmins (mismo
// criterio que "Asistencias" en nav-user.tsx).
export default async function WebsKelatosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin";
  if (!esAdmin && !esSuperadmin(session?.user?.email)) redirect("/");

  return (
    <SidebarProvider>
      <WebsKelatosSidebar session={session} />
      <SidebarInset>
        <WebsKelatosHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
