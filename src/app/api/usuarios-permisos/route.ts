import { actorSuperadmin, llamar } from "@/lib/usuarios-permisos-api";

export async function GET() {
  const a = await actorSuperadmin();
  if (!a.ok) return a.respuesta;
  return llamar("/todo", "GET", null, a.email);
}
