import { actorSuperadmin, llamar } from "@/lib/usuarios-permisos-api";

export async function PUT(req: Request, { params }: { params: Promise<{ rol: string }> }) {
  const a = await actorSuperadmin();
  if (!a.ok) return a.respuesta;
  const { rol } = await params;
  return llamar(`/roles/${encodeURIComponent(rol)}/permisos`, "PUT", (await req.json().catch(() => ({}))) as Record<string, unknown>, a.email);
}
