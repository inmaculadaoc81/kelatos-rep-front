import { adminGet } from "@/lib/asistencia-proxy";

export async function GET(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params;
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde") || undefined;
  const hasta = searchParams.get("hasta") || undefined;
  return adminGet(`/v1/asistencia/admin/remote-workers/${encodeURIComponent(deviceId)}/activity`, { desde, hasta });
}
