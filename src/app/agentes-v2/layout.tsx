import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AgentesV2Sidebar } from "./sidebar";
import { AgentesV2Header } from "./header";

// AI Marketing System: vista aparte, fuera de (app)/ (mismo patrón que Agentes, Mails y Asistencia).
// Acceso: administradores y superadmins. Se repite en src/proxy.ts (el prefijo /agentes ya lo cubre) y en
// el proxy de API /api/agentes-v2 (defensa en profundidad).
export default async function AgentesV2Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin";
  if (!esAdmin && !esSuperadmin(session?.user?.email)) redirect("/");

  return (
    <SidebarProvider>
      <AgentesV2Sidebar session={session} />
      <SidebarInset>
        <AgentesV2Header />
        <main className="flex-1 bg-white p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
