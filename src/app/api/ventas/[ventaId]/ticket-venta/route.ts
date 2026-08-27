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
  venta: Record<string, unknown>;
}

/**
 * "Ticket Rápido" para Ventas (pedidos de piezas) — mismo mecanismo que
 * /api/reparaciones/[resguardo]/ticket-venta (kelatos_app.ticket_venta_seq
 * compartido, Serie 1, PDF guardado en Drive), pero contra
 * kelatos_app.ventas en vez de kelatos_app.reparaciones. Petición del
 * usuario, 2026-08-27: "en venta de piezas los tickets también deben estar".
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
  const lineas = Array.isArray(datos?.lineas) ? (datos.lineas as LineaTicket[]) : [];
  if (!lineas.length) return NextResponse.json({ ok: false, error: "Debe incluir al menos una línea" }, { status: 400 });
  const estado = datos?.estado === "Pendiente" ? "Pendiente" : "Cobrada";
  const formaPago = typeof datos?.formaPago === "string" ? datos.formaPago : "";
  const banco = typeof datos?.banco === "string" ? datos.banco : "";

  try {
    const resultado = await kelatosApiPost<RespuestaTicketVenta>(
      `/v1/ventas/${encodeURIComponent(ventaId)}/ticket-venta`,
      { requestId: crypto.randomUUID(), usuario, lineas, estado, formaPago, banco }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, venta: resultado.venta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
