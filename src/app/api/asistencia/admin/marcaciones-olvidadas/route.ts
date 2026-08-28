import { adminGet } from "@/lib/asistencia-proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return adminGet("/v1/asistencia/admin/marcaciones-olvidadas", {
    employeeId: searchParams.get("employeeId") || undefined,
  });
}
