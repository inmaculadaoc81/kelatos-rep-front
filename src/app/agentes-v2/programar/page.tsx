import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { puedeProgramarContenido } from "@/lib/programador-contenido";
import { ProgramarView } from "./programar-view";
import { tienePermiso } from "@/lib/permisos";

/** Programar contenido: administradores, superadmins y la community manager (esta última solo ve esta pantalla de Agentes V2). */
export default async function ProgramarContenidoPage() {
  const session = await auth();
  const emailU = session?.user?.email;
  if (!((await tienePermiso(emailU, "agentes.programar", puedeProgramarContenido(session?.user))) || (await tienePermiso(emailU, "agentes.ver", false)))) redirect("/");
  return <ProgramarView />;
}
