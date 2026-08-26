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
  reparacion: Record<string, unknown>;
}

/**
 * Segunda fase del ciclo Devolución/Rectificativa/Corregida de un Ticket
 * Rápido — un ticket nuevo e independiente (Serie 1, misma ticket_venta_seq
 * que el original) que reemplaza al que se anuló con la rectificativa.
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
  const lineas = Array.isArray(datos?.lineas) ? (datos.lineas as LineaTicket[]) : [];
  if (!lineas.length) return NextResponse.json({ ok: false, error: "Debe incluir al menos una línea" }, { status: 400 });
  const estado = datos?.estado === "Pendiente" ? "Pendiente" : "Cobrada";

  try {
    const resultado = await kelatosApiPost<RespuestaTicketCorregida>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/ticket-venta/corregida`,
      { requestId: crypto.randomUUID(), usuario, lineas, estado }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
