import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { permisosAplicadosDe } from "@/lib/permisos";
import { PermisosProvider } from "@/lib/permisos-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { RrhhSidebar } from "./sidebar";
import { RrhhHeader } from "./header";

// Dashboard aparte (mismo patrón que Tareas o Gestión MAILS), fuera de (app)/: lo usan también quienes solo fichan,
// que desde aquí no tienen acceso a nada más (lo bloquea src/proxy.ts y NavUser oculta sus botones).
export default async function RrhhLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!email) redirect("/login");
  const [permisos, esRrhh] = await Promise.all([
    permisosAplicadosDe(email),
    kelatosApiGet<{ ok: boolean; rrhh: boolean }>("/v1/rrhh/yo", { usuario: email }).then((d) => d.rrhh).catch(() => esSuperadmin(email)),
  ]);

  return (
    <PermisosProvider valor={permisos}>
      <SidebarProvider>
        <RrhhSidebar session={session} esRrhh={esRrhh} conFichaje={session?.user?.asistenciaEmpleadoId != null} />
        <SidebarInset>
          <RrhhHeader />
          <main className="min-w-0 flex-1 bg-white p-4 sm:p-6 dark:bg-background">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </PermisosProvider>
  );
}
