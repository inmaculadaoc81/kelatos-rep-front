import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { puedeProgramarContenido } from "@/lib/programador-contenido";
import { CarruselesVista } from "./carruseles-vista";

/** Carruseles de la marca elegida (ver, editar el texto, regenerar y exportar): para la community manager y los administradores. */
export default async function CarruselesPage() {
  const session = await auth();
  if (!puedeProgramarContenido(session?.user)) redirect("/");
  return <CarruselesVista />;
}
