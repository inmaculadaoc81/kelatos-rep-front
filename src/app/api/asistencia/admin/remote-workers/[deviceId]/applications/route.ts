import { adminGet } from "@/lib/asistencia-proxy";

export async function GET(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params;
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha") || undefined;
  return adminGet(`/v1/asistencia/admin/remote-workers/${encodeURIComponent(deviceId)}/applications`, { fecha });
}
