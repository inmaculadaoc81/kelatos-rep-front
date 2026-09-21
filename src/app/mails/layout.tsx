import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MailsSidebar } from "./sidebar";
import { MailsHeader } from "./header";

// Dashboard aparte (mismo patrón que Agentes/Webs Kelatos/Transferencias),
// fuera de (app)/. Acceso: administradores y superadmins. Esta comprobación
// se duplica en src/proxy.ts (defensa en profundidad).
export default async function MailsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin";
  if (!esAdmin && !esSuperadmin(session?.user?.email)) redirect("/");

  return (
    <SidebarProvider>
      <MailsSidebar session={session} />
      <SidebarInset>
        <MailsHeader />
        <main className="flex-1 bg-white p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
