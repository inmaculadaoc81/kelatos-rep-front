import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AgentesV2Sidebar } from "./sidebar";
import { AgentesV2Header } from "./header";
import { OrganizacionProvider } from "./organizacion-context";
import { esProgramadorContenido } from "@/lib/programador-contenido";
import Link from "next/link";

// AI Marketing System: vista aparte, fuera de (app)/ (mismo patrón que Agentes, Mails y Asistencia).
// Acceso: administradores y superadmins. Se repite en src/proxy.ts (el prefijo /agentes ya lo cubre) y en
// el proxy de API /api/agentes-v2 (defensa en profundidad).
export default async function AgentesV2Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const esAdmin = session?.user?.role === "admin";
  const esAdminOSuper = esAdmin || esSuperadmin(session?.user?.email);
  // La community manager (empleada 23) no es administradora: ve una versión reducida de Agentes V2 con solo
  // «Programar contenido» (proxy.ts ya la limita a esa ruta, y /api/agentes-v2 a lo imprescindible).
  const soloProgramar = !esAdminOSuper && esProgramadorContenido(session?.user);
  if (!esAdminOSuper && !soloProgramar) redirect("/");

  if (soloProgramar) {
    return (
      <OrganizacionProvider>
        <div className="min-h-svh bg-white">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <span className="text-sm font-semibold">Kelatos · Programar contenido</span>
            <Link href="/asistencia/contenido" className="text-sm text-muted-foreground hover:text-foreground">Volver a mi panel de Contenido</Link>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </OrganizacionProvider>
    );
  }

  return (
    <OrganizacionProvider>
      <SidebarProvider>
        <AgentesV2Sidebar session={session} />
        <SidebarInset>
          <AgentesV2Header />
          <main className="flex-1 bg-white p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </OrganizacionProvider>
  );
}
