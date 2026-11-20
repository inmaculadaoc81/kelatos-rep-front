import { actorSuperadmin, llamar } from "@/lib/usuarios-permisos-api";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; origen: string }> }) {
  const a = await actorSuperadmin();
  if (!a.ok) return a.respuesta;
  const { id, origen } = await params;
  return llamar(`/usuarios/${encodeURIComponent(id)}/copiar-de/${encodeURIComponent(origen)}`, "POST", {}, a.email);
}
