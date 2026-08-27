import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface RespuestaTicketRectificativa {
  ok: boolean;
  numeroTicket: string;
  urlTicket: string;
  ticket: Record<string, unknown>;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const datos = await req.json();
  const motivo = typeof datos?.motivo === "string" ? datos.motivo.trim() : "";
  if (!motivo) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });
  const formaPago = typeof datos?.formaPago === "string" ? datos.formaPago : "";
  const banco = typeof datos?.banco === "string" ? datos.banco : "";

  try {
    const resultado = await kelatosApiPost<RespuestaTicketRectificativa>(
      `/v1/tickets-manuales/${encodeURIComponent(id)}/rectificativa`,
      { requestId: crypto.randomUUID(), usuario, motivo, formaPago, banco }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, ticket: resultado.ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
