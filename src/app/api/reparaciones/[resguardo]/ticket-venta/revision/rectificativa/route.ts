import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface RespuestaTicketRectificativa {
  ok: boolean;
  numeroTicket: string;
  urlTicket: string;
  reparacion: Record<string, unknown>;
}

/**
 * "Devolución" del ticket de revisión (Marcar revisión pagada → Ticket) —
 * mismo mecanismo que /ticket-venta/rectificativa, pero con columnas
 * propias (numero_ticket_revision_rectificativa, migración 054) para no
 * pisar el ciclo del Ticket Rápido general de la misma reparación.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const datos = await req.json();
  const motivo = typeof datos?.motivo === "string" ? datos.motivo.trim() : "";
  if (!motivo) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });
  const formaPago = typeof datos?.formaPago === "string" ? datos.formaPago : "";
  const banco = typeof datos?.banco === "string" ? datos.banco : "";

  try {
    const resultado = await kelatosApiPost<RespuestaTicketRectificativa>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/ticket-venta/revision/rectificativa`,
      { requestId: crypto.randomUUID(), usuario, motivo, formaPago, banco }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
