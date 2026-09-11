import { adminPost } from "@/lib/asistencia-proxy";

export async function POST(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params;
  const body = await req.json().catch(() => ({}));
  return adminPost(`/v1/asistencia/admin/remote-workers/${encodeURIComponent(deviceId)}/assign`, {
    employeeId: body?.employeeId ?? null,
  });
}
