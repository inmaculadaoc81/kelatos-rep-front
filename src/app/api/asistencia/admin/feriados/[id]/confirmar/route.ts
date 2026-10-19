import { adminPost } from "@/lib/asistencia-proxy";

/** Marca como confirmado un feriado provisional (ya comprobado en la publicación oficial). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminPost(`/v1/asistencia/admin/feriados/${encodeURIComponent(id)}/confirmar`);
}
