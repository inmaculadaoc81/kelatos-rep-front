import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { puedeProgramarContenido } from "@/lib/programador-contenido";
import { CarruselesVista } from "./carruseles-vista";
import { tienePermiso } from "@/lib/permisos";

/** Carruseles de la marca elegida (ver, editar el texto, regenerar y exportar): para la community manager y los administradores. */
export default async function CarruselesPage() {
  const session = await auth();
  const emailU = session?.user?.email;
  if (!((await tienePermiso(emailU, "agentes.programar", puedeProgramarContenido(session?.user))) || (await tienePermiso(emailU, "agentes.ver", false)))) redirect("/");
  return <CarruselesVista />;
}
