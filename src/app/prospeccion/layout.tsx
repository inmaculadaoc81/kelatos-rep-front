import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { puedeVerProspeccion } from "@/lib/prospeccion";
import { ProspeccionSidebar } from "./sidebar";
import { ProspeccionHeader } from "./header";
import { tienePermiso } from "@/lib/permisos";

// Dashboard aparte (como CRM/Tareas), fuera de (app)/: agente que escribe a empresas con la IA local. Solo administradores.
export default async function ProspeccionLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await tienePermiso(session.user.email, "prospeccion.ver", puedeVerProspeccion(session.user)))) redirect("/");

  return (
    <SidebarProvider>
      <ProspeccionSidebar session={session} />
      <SidebarInset>
        <ProspeccionHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
