import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { puedeAdministrarComercial } from "@/lib/comercial";

// Listas, agentes y actividad: solo administradores. Un agente que escriba la dirección a mano vuelve a su panel (y la API tampoco le daría los datos).
export default async function ComercialAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!puedeAdministrarComercial(session?.user)) redirect("/comercial");
  return <>{children}</>;
}
