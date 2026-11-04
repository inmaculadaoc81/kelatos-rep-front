import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { OrganizacionProvider } from "../agentes-v2/organizacion-context";
import { rolRedes } from "./acceso";
import { RedesSidebar } from "./sidebar";
import { RedesHeader } from "./header";

// Redes sociales: un solo panel para todo lo de redes. Reúne Contenido (piezas, vídeos, calendario, recursos: general, no depende de la marca) y lo de Agentes V2
// que se usa (Redes sociales y SEO local de cada organización, carruseles, programación, aprobaciones y analítica). Esas pantallas siguen funcionando igual.
// Acceso: administradores y superadmins ven todo; la community manager ve solo su parte (ver acceso.ts).
export default async function RedesSocialesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const rol = rolRedes(session);
  if (!rol) redirect("/");

  return (
    <OrganizacionProvider>
      <SidebarProvider>
        <RedesSidebar session={session} rol={rol} />
        <SidebarInset>
          <RedesHeader />
          <main className="flex-1 bg-white p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </OrganizacionProvider>
  );
}
