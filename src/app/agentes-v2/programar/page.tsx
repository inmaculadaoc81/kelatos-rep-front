import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { puedeProgramarContenido } from "@/lib/programador-contenido";
import { ProgramarView } from "./programar-view";

/** Programar contenido: administradores, superadmins y la community manager (esta última solo ve esta pantalla de Agentes V2). */
export default async function ProgramarContenidoPage() {
  const session = await auth();
  if (!puedeProgramarContenido(session?.user)) redirect("/");
  return <ProgramarView />;
}
