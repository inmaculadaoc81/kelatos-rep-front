import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TareasSidebar } from "./sidebar";
import { TareasHeader } from "./header";

// Dashboard aparte (como Webs Kelatos/Asistencia), fuera de (app)/ — petición del
// usuario, 2026-09-29: gestión de tareas del equipo, estilo Notion pero simple.
// Sin restricción de admin: cualquier empleado con cuenta @kelatos.com necesita
// entrar a ver sus tareas asignadas y anotar en qué va, no solo quien las crea.
export default async function TareasLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  return (
    <SidebarProvider>
      <TareasSidebar session={session} />
      <SidebarInset>
        <TareasHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
