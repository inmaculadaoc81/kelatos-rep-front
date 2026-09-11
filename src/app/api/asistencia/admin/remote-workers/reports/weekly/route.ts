import { adminGet } from "@/lib/asistencia-proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || undefined;
  const fechaInicio = searchParams.get("fechaInicio") || undefined;
  return adminGet("/v1/asistencia/admin/remote-workers/reports/weekly", { employeeId, fechaInicio });
}
