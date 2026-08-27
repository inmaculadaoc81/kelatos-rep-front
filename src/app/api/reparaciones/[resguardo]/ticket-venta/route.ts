import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface LineaTicket {
  descripcion: string;
  cantidad: number;
  precio: number;
}

interface RespuestaTicketVenta {
  ok: boolean;
  numeroTicket: string;
  urlTicket: string;
  reparacion: Record<string, unknown>;
}

/**
 * "Ticket Rápido" (accion-requerida.tsx, junto a "Facturación") —
 * numeración real desde kelatos_app.ticket_venta_seq, PDF guardado en
 * Drive. NO marca entrega — igual que emitir una factura real, eso sigue
 * siendo un paso aparte ("Entregado en Local"/"Marcar como enviado").
 * A diferencia de /api/tickets/generar-prueba (que devuelve el PDF binario
 * directo), este endpoint persiste y devuelve JSON con el enlace, igual
 * que el resto de endpoints de facturación.
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
  // "modo: revision" (Marcar revisión pagada → Ticket) se perdía aquí: se
  // recibía en el body pero nunca se reenviaba al backend, así que el
  // ticket se generaba como Ticket Rápido normal (numero_ticket) en vez de
  // como ticket de revisión (numero_ticket_revision + revision_pagada =
  // true) — bug real reportado, 2026-08-26. "anticipo" añadido 2026-08-27,
  // mismo mecanismo para el ticket de Anticipo. "mensajeria" añadido el
  // mismo día para "Envío por Mensajería" — mismo bug exacto reportado de
  // nuevo: el ticket se guardaba en numero_ticket en vez de
  // numero_ticket_mensajeria, y luego "Enviar al cliente" fallaba con "No
  // existe un ticket de tipo 'mensajeria'".
  const modo = datos?.modo === "revision" ? "revision" : datos?.modo === "anticipo" ? "anticipo" : datos?.modo === "mensajeria" ? "mensajeria" : undefined;
  const formaPago = typeof datos?.formaPago === "string" ? datos.formaPago : "";
  const banco = typeof datos?.banco === "string" ? datos.banco : "";
  const emailTicket = typeof datos?.emailTicket === "string" ? datos.emailTicket : "";

  try {
    const resultado = await kelatosApiPost<RespuestaTicketVenta>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/ticket-venta`,
      { requestId: crypto.randomUUID(), usuario, lineas, estado, modo, formaPago, banco, emailTicket }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
