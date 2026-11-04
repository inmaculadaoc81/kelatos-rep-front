import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { esSuperadmin } from "@/lib/superadmin";

// Agentes operativos (auditoría de seguridad, SEO de vídeo, oportunidades de PR) dentro de Gestión MAILS: solo superadmins.
export default async function AgentesEnMailsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) redirect("/mails/bandeja");
  return <>{children}</>;
}
