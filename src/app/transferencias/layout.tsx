import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TransferenciasSidebar } from "./sidebar";
import { TransferenciasHeader } from "./header";

// proxy.ts ya redirige a los no-superadmin, pero se repite aquí la
// comprobación (defensa en profundidad, mismo patrón que otras páginas
// sensibles) — esta vista queda deliberadamente FUERA de (app)/, con su
// propio sidebar (puerto del sidebar de "Transferencias-2"): es un
// dashboard aparte, no una sección más de Reparaciones.
export default async function TransferenciasLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) redirect("/");

  return (
    <SidebarProvider>
      <TransferenciasSidebar session={session} />
      <SidebarInset>
        <TransferenciasHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
