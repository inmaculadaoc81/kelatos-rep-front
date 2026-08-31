import { adminGet } from "@/lib/asistencia-proxy";

export async function GET(req: Request) {
  const fichajeId = new URL(req.url).searchParams.get("fichajeId") || undefined;
  return adminGet("/v1/asistencia/admin/auditoria", { fichajeId });
}
