import { actorSuperadmin, llamar } from "@/lib/usuarios-permisos-api";

export async function PUT(req: Request) {
  const a = await actorSuperadmin();
  if (!a.ok) return a.respuesta;
  return llamar("/modulos", "PUT", (await req.json().catch(() => ({}))) as Record<string, unknown>, a.email);
}
