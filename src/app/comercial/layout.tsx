import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { puedeAdministrarComercial, puedeVerComercial } from "@/lib/comercial";
import { SoftphoneProvider } from "../(app)/softphone";
import { ComercialProvider } from "./contexto";
import { ComercialSidebar } from "./sidebar";
import { ComercialHeader } from "./header";

// Dashboard aparte (como CRM/Tareas), fuera de (app)/: panel de los agentes comerciales — llaman a listas de empresas, registran el resultado
// y agendan reuniones. Lo ve el administrador (con gestión de listas, agentes y actividad) y cada agente (solo lo suyo). El softphone del
// dashboard se monta aquí para poder llamar con auriculares desde esta misma página.
export default async function ComercialLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!puedeVerComercial(session.user)) redirect("/");
  const admin = puedeAdministrarComercial(session.user);

  return (
    <SoftphoneProvider>
      <ComercialProvider valor={{ admin, email: session.user.email.toLowerCase(), nombre: session.user.name || session.user.email }}>
        <SidebarProvider>
          <ComercialSidebar session={session} admin={admin} />
          <SidebarInset>
            <ComercialHeader admin={admin} />
            <main className="flex-1 p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </ComercialProvider>
    </SoftphoneProvider>
  );
}
