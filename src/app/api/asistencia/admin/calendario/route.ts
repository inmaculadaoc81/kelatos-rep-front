import { adminGet } from "@/lib/asistencia-proxy";

/** Ausencias (vacaciones, días libres, descansos médicos) y feriados de un rango de fechas, por país. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return adminGet("/v1/asistencia/admin/calendario-ausencias", {
    desde: searchParams.get("desde") || undefined,
    hasta: searchParams.get("hasta") || undefined,
    pais: searchParams.get("pais") || undefined,
  });
}
