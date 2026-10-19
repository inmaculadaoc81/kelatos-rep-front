import { adminGet, adminPost } from "@/lib/asistencia-proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return adminGet("/v1/asistencia/admin/feriados", {
    anio: searchParams.get("anio") || undefined,
    pais: searchParams.get("pais") || undefined,
  });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return adminPost("/v1/asistencia/admin/feriados", { fecha: b.fecha, pais: b.pais, ambito: b.ambito, nombre: b.nombre });
}
