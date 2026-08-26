import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface LineaTicket {
  descripcion: string;
  cantidad: number;
  precio: number;
}

interface RespuestaTicketCorregida {
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
  const lineas = Array.isArray(datos?.lineas) ? (datos.lineas as LineaTicket[]) : [];
  if (!lineas.length) return NextResponse.json({ ok: false, error: "Debe incluir al menos una línea" }, { status: 400 });
  const estado = datos?.estado === "Pendiente" ? "Pendiente" : "Cobrada";

  try {
    const resultado = await kelatosApiPost<RespuestaTicketCorregida>(
      `/v1/tickets-manuales/${encodeURIComponent(id)}/corregida`,
      { requestId: crypto.randomUUID(), usuario, lineas, estado }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, ticket: resultado.ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
