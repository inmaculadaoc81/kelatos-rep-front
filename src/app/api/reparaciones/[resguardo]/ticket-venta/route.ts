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
 * Drive, y marca el equipo como entregado en local (mismo comportamiento
 * que emitir una factura real). A diferencia de /api/tickets/generar-prueba
 * (que devuelve el PDF binario directo), este endpoint persiste y devuelve
 * JSON con el enlace, igual que el resto de endpoints de facturación.
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

  try {
    const resultado = await kelatosApiPost<RespuestaTicketVenta>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/ticket-venta`,
      { requestId: crypto.randomUUID(), usuario, lineas }
    );
    return NextResponse.json({ ok: true, numeroTicket: resultado.numeroTicket, urlTicket: resultado.urlTicket, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
