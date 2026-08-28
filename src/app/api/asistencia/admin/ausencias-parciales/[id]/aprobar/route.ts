import { adminPost } from "@/lib/asistencia-proxy";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminPost(`/v1/asistencia/admin/ausencias-parciales/${id}/aprobar`);
}
