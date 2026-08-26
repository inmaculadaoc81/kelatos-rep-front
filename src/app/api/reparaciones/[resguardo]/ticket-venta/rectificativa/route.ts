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
 * "Devolución" de un Ticket Rápido (Facturas de Clientes) — genera una
 * rectificativa de ticket (Serie 3, secuencia propia ticket_rectificativa_seq,
 * nunca la fiscal real) con el importe total en negativo.
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

  try {
    const resultado = await kelatosApiPost<RespuestaTicketRectificativa>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/ticket-venta/rectificativa`,
      { requestId: crypto.randomUUID(), usuario, motivo }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
