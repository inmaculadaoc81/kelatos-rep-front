import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { WhatsappSidebar } from "./sidebar";
import { WhatsappHeader } from "./header";
import { tienePermiso, permisosAplicadosDe } from "@/lib/permisos";
import { PermisosProvider } from "@/lib/permisos-context";

// Dashboard aparte (mismo patrón que Gestión MAILS/CRM/Prospección), fuera de (app)/.
// Acceso: administradores, superadmins y cuentas accesoCompleto (como Gestión MAILS).
// Esta comprobación se duplica en src/proxy.ts (defensa en profundidad).
export default async function WhatsappLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin";
  const emailU = session?.user?.email;
  if (!(await tienePermiso(emailU, "mails.ver", esAdmin || esSuperadmin(emailU) || !!session?.user?.accesoCompleto))) redirect("/");
  const restringido = !(await tienePermiso(emailU, "mails.administrar", !session?.user?.accesoCompleto));
  const permisos = await permisosAplicadosDe(emailU);

  return (
    <PermisosProvider valor={permisos}>
    <SidebarProvider>
      <WhatsappSidebar session={session} restringido={restringido} />
      <SidebarInset>
        <WhatsappHeader />
        <main className="flex-1 bg-white p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
    </PermisosProvider>
  );
}
