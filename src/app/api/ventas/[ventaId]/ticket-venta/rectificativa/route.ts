import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface RespuestaTicketRectificativa {
  ok: boolean;
  numeroTicket: string;
  urlTicket: string;
  venta: Record<string, unknown>;
}

/**
 * "Devolución" de un Ticket de Venta — mismo mecanismo que
 * /api/reparaciones/[resguardo]/ticket-venta/rectificativa.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ ventaId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { ventaId } = await params;
  const datos = await req.json();
  const motivo = typeof datos?.motivo === "string" ? datos.motivo.trim() : "";
  if (!motivo) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<RespuestaTicketRectificativa>(
      `/v1/ventas/${encodeURIComponent(ventaId)}/ticket-venta/rectificativa`,
      { requestId: crypto.randomUUID(), usuario, motivo }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, venta: resultado.venta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
