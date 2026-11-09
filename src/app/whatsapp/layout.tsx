import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { WhatsappSidebar } from "./sidebar";
import { WhatsappHeader } from "./header";

// Dashboard aparte (mismo patrón que Gestión MAILS/CRM/Prospección), fuera de (app)/.
// Acceso: administradores, superadmins y cuentas accesoCompleto (como Gestión MAILS).
// Esta comprobación se duplica en src/proxy.ts (defensa en profundidad).
export default async function WhatsappLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin";
  if (!esAdmin && !esSuperadmin(session?.user?.email) && !session?.user?.accesoCompleto) redirect("/");

  return (
    <SidebarProvider>
      <WhatsappSidebar session={session} />
      <SidebarInset>
        <WhatsappHeader />
        <main className="flex-1 bg-white p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
