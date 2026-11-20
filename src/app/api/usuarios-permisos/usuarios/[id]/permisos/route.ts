import { actorSuperadmin, llamar } from "@/lib/usuarios-permisos-api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await actorSuperadmin();
  if (!a.ok) return a.respuesta;
  const { id } = await params;
  return llamar(`/usuarios/${encodeURIComponent(id)}/permisos`, "PUT", (await req.json().catch(() => ({}))) as Record<string, unknown>, a.email);
}
