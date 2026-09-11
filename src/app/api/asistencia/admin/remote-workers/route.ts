import { adminGet } from "@/lib/asistencia-proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const unassigned = searchParams.get("unassigned") || undefined;
  return adminGet("/v1/asistencia/admin/remote-workers", { unassigned });
}
