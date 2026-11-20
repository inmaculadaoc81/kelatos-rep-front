import { actorSuperadmin, llamar } from "@/lib/usuarios-permisos-api";

export async function GET() {
  const a = await actorSuperadmin();
  if (!a.ok) return a.respuesta;
  return llamar("/auditoria?limit=200", "GET", null, a.email);
}
