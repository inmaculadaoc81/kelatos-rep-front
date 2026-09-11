import { adminPost } from "@/lib/asistencia-proxy";

/**
 * Sustituye a aprobar-auto (quitada el 2026-09-11, "no puede haber
 * autoaprobados") — aquí solo se marca la solicitud como resuelta,
 * enlazándola con el fichaje que la persona admin ya creó a mano vía
 * POST /api/asistencia/admin/fichajes. Nunca reconstruye nada por su
 * cuenta.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { fichajeCreadoId?: number };
  return adminPost(`/v1/asistencia/admin/marcaciones-olvidadas/${id}/aprobar-manual`, {
    fichajeCreadoId: body.fichajeCreadoId,
  });
}
