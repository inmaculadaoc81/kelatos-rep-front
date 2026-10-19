import { adminPost } from "@/lib/asistencia-proxy";

/** Crea una ausencia ya aprobada desde el calendario (el administrador la registra directamente). */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return adminPost("/v1/asistencia/admin/ausencias", {
    employeeId: b.employeeId,
    tipo: b.tipo,
    fechaInicio: b.fechaInicio,
    fechaFin: b.fechaFin,
    motivo: b.motivo,
  });
}
