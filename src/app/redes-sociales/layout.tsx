import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { OrganizacionProvider } from "../agentes-v2/organizacion-context";
import { RedesSidebar } from "./sidebar";
import { RedesHeader } from "./header";

// Redes sociales: un solo panel para toda la actividad (vídeos subidos y pendientes, carruseles de la IA, calendario) y la analítica de cada red.
// Reúne lo que antes estaba repartido entre Contenido, Agentes V2 y Agentes → Redes sociales; esas pantallas siguen funcionando igual.
// Acceso: administradores y superadmins.
export default async function RedesSocialesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdminOSuper = session?.user?.role === "admin" || esSuperadmin(session?.user?.email);
  if (!esAdminOSuper) redirect("/");

  return (
    <OrganizacionProvider>
      <SidebarProvider>
        <RedesSidebar session={session} />
        <SidebarInset>
          <RedesHeader />
          <main className="flex-1 bg-white p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </OrganizacionProvider>
  );
}
