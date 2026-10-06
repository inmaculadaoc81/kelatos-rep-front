import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { puedeVerContenido } from "@/lib/contenido-acceso";
import { ContenidoSidebar } from "./sidebar";
import { ContenidoHeader } from "./header";

// Panel de contenido — dashboard propio (mismo esquema que Gestión MAILS).
// Acceso: el empleado de contenido y la cuenta de administración, ver
// lib/contenido-acceso.ts. Cualquier otra sesión vuelve a Fichar.
export default async function ContenidoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!puedeVerContenido(session)) redirect("/asistencia/kiosk");

  return (
    <SidebarProvider>
      <ContenidoSidebar session={session} />
      <SidebarInset>
        <ContenidoHeader />
        <main className="flex-1 bg-white p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
