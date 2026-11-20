import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { puedeVerCrm } from "@/lib/crm";
import { N8nLabsSidebar } from "./sidebar";
import { N8nLabsHeader } from "./header";
import { tienePermiso } from "@/lib/permisos";

// Dashboard aparte (como CRM/Tareas), fuera de (app)/: leads del formulario de automatizacionesn8n.com ya puntuados. Solo administradores.
export default async function N8nLabsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await tienePermiso(session.user.email, "n8nlabs.ver", puedeVerCrm(session.user)))) redirect("/");

  return (
    <SidebarProvider>
      <N8nLabsSidebar session={session} />
      <SidebarInset>
        <N8nLabsHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
