import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AsistenciaSidebar } from "../sidebar";
import { AsistenciaHeader } from "../header";

// Sidebar propio (mismo componente Sidebar de shadcn que Reparaciones/
// Transferencias) — solo para el panel admin. El kiosco (de cara al
// empleado que ficha) tiene su propio layout minimalista, sin esto
// alrededor — ver src/app/asistencia/kiosk/layout.tsx.
export default async function AsistenciaAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esManager = session?.user?.role === "admin" || esSuperadmin(session?.user?.email);
  if (!esManager) redirect("/asistencia/kiosk");

  return (
    <SidebarProvider>
      <AsistenciaSidebar session={session} />
      <SidebarInset>
        <AsistenciaHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
