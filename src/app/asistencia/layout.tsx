import { redirect } from "next/navigation";
import { auth, esDominioKelatos } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AsistenciaSidebar } from "./sidebar";
import { AsistenciaHeader } from "./header";

// proxy.ts ya filtra el acceso — esta comprobación se repite aquí como
// defensa en profundidad (mismo patrón que Transferencias). Entra
// cualquiera con sesión válida que sea del dominio @kelatos.com, admin,
// o esté dado de alta como empleado que ficha (asistenciaEmpleadoId).
// Sidebar propio (mismo componente Sidebar de shadcn que Reparaciones/
// Transferencias) en vez de la barra de pestañas horizontal anterior —
// petición del usuario, 2026-08-28.
export default async function AsistenciaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email || "";
  const permitido = !!email && (esDominioKelatos(email) || esSuperadmin(email) || session?.user?.asistenciaEmpleadoId != null);
  if (!permitido) redirect("/login");

  return (
    <SidebarProvider>
      <AsistenciaSidebar session={session} />
      <SidebarInset>
        <AsistenciaHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
