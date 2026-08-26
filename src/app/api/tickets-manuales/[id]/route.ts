import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapTicketManualDetalle } from "@/lib/ticket-manual";

/**
 * Proxy de GET /v1/tickets-manuales/:id — alimenta el modal con tabs
 * (PDF/Enviar, Devolución, Rectificativo) de un ticket manual.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; ticket: Parameters<typeof mapTicketManualDetalle>[0] }>(
      `/v1/tickets-manuales/${encodeURIComponent(id)}`
    );
    return NextResponse.json({ ok: true, detalle: mapTicketManualDetalle(data.ticket) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
