import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MailsSidebar } from "./sidebar";
import { MailsHeader } from "./header";
import { AlertaBuzones } from "./alerta-buzones";

// Dashboard aparte (mismo patrón que Agentes/Webs Kelatos/Transferencias),
// fuera de (app)/. Acceso: administradores, superadmins y cuentas
// accesoCompleto (migración 160 — ven una vista recortada, ver sidebar.tsx).
// Esta comprobación se duplica en src/proxy.ts (defensa en profundidad).
export default async function MailsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin";
  if (!esAdmin && !esSuperadmin(session?.user?.email) && !session?.user?.accesoCompleto) redirect("/");

  return (
    <SidebarProvider>
      <MailsSidebar session={session} />
      <SidebarInset>
        <MailsHeader />
        <main className="flex-1 bg-white p-6">
          <AlertaBuzones />
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
