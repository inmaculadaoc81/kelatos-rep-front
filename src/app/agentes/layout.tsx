import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AgentesSidebar } from "./sidebar";
import { AgentesHeader } from "./header";

// Dashboard aparte (mismo patrón que Webs Kelatos/Transferencias), fuera
// de (app)/. Acceso: administradores y superadmins. Esta comprobación se
// duplica en src/proxy.ts (defensa en profundidad).
export default async function AgentesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin";
  if (!esAdmin && !esSuperadmin(session?.user?.email)) redirect("/");

  return (
    <SidebarProvider>
      <AgentesSidebar session={session} />
      <SidebarInset>
        <AgentesHeader />
        <main className="flex-1 bg-white p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
