import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { puedeVerRedesSociales } from "@/lib/redes-sociales-acceso";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AgentesSidebar } from "./sidebar";
import { AgentesHeader } from "./header";

// Dashboard aparte (mismo patrón que Webs Kelatos/Transferencias), fuera
// de (app)/. Acceso: administradores y superadmins. Esta comprobación se
// duplica en src/proxy.ts (defensa en profundidad).
export default async function AgentesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin" || esSuperadmin(session?.user?.email);
  // Carlo, Cielo, Gean y Jeannie también pasan, pero solo ven «Redes sociales» (el proxy bloquea el resto de rutas de Agentes).
  if (!esAdmin && !puedeVerRedesSociales(session?.user)) redirect("/");

  return (
    <SidebarProvider>
      <AgentesSidebar session={session} soloRedes={!esAdmin} />
      <SidebarInset>
        <AgentesHeader />
        <main className="flex-1 bg-white p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
