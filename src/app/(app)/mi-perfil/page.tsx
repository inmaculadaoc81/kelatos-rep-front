import { auth } from "@/auth";
import { PerfilContenido } from "./perfil-contenido";

export default async function MiPerfilPage() {
  const session = await auth();
  return <PerfilContenido session={session} />;
}
