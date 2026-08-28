import { adminGet } from "@/lib/asistencia-proxy";

export async function GET() {
  return adminGet("/v1/asistencia/admin/auditoria");
}
