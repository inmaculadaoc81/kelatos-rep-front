import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface LineaTicket {
  descripcion: string;
  cantidad: number;
  precio: number;
}

interface ClienteTicket {
  nombre: string;
  direccion: string;
  dni: string;
  telefono: string;
  email: string;
}

interface RespuestaTicketManual {
  ok: boolean;
  numeroTicket: string;
  urlTicket: string;
  ticket: Record<string, unknown>;
}

/**
 * "Ticket Manual" persistido de verdad (kelatos_app.tickets_manuales,
 * migración 055) — petición del usuario, 2026-08-27: "haz que ya no sea
 * de pruebas que sea manual normal de ticket". Numeración real
 * (ticket_venta_seq, Serie 1), PDF guardado en Drive, visible después en
 * Facturas de Clientes.
 */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = await req.json();
  const lineas = Array.isArray(datos?.lineas) ? (datos.lineas as LineaTicket[]) : [];
  if (!lineas.length) return NextResponse.json({ ok: false, error: "Debe incluir al menos una línea" }, { status: 400 });
  const estado = datos?.estado === "Pendiente" ? "Pendiente" : "Cobrada";
  const notas = typeof datos?.notas === "string" ? datos.notas : "";
  const cliente = datos?.cliente && typeof datos.cliente === "object" ? (datos.cliente as ClienteTicket) : undefined;
  const formaPago = typeof datos?.formaPago === "string" ? datos.formaPago : "";
  const banco = typeof datos?.banco === "string" ? datos.banco : "";

  try {
    const resultado = await kelatosApiPost<RespuestaTicketManual>(
      "/v1/tickets-manuales/crear",
      { requestId: crypto.randomUUID(), usuario, lineas, estado, notas, cliente, formaPago, banco }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, ticket: resultado.ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
