import { auth } from "@/auth";
import { adminGet } from "@/lib/asistencia-proxy";

export async function GET(_req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params;
  const session = await auth();
  const usuario = session?.user?.email || "desconocido";
  return adminGet(`/v1/asistencia/admin/remote-workers/${encodeURIComponent(deviceId)}`, { usuario });
}
