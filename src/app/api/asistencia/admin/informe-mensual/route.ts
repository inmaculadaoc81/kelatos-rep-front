import { adminGet } from "@/lib/asistencia-proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return adminGet("/v1/asistencia/admin/informe-mensual", {
    desde: searchParams.get("desde") || undefined,
    hasta: searchParams.get("hasta") || undefined,
    employeeIds: searchParams.get("employeeIds") || undefined,
  });
}
