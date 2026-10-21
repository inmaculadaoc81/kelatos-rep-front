import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { puedeVerCrm } from "@/lib/crm";
import { CrmSidebar } from "./sidebar";
import { CrmHeader } from "./header";

// Dashboard aparte (como Tareas/Webs Kelatos), fuera de (app)/ — petición del usuario, 2026-10-21: un CRM tipo
// Salesforce donde acaben los leads de WhatsApp (Chatwoot), llamadas (Retell) y las webs. Solo administradores:
// contiene datos de personas que todavía no son clientes.
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!puedeVerCrm(session.user)) redirect("/");

  return (
    <SidebarProvider>
      <CrmSidebar session={session} />
      <SidebarInset>
        <CrmHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
