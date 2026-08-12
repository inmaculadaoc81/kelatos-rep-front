import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Proxy de POST /v1/pedidos/cambiar-estado-masivo (cambiarEstadoPedido /
 * marcarPiezaEnTransito / _ejecutarRecepcionPedidos del original) — cambia
 * el estado de uno o varios pedidos a la vez (p.ej. "En Tránsito" o
 * "Recibido"); cuando el nuevo estado es "Recibido" y ya no quedan pedidos
 * pendientes para una reparación, el backend la pasa automáticamente a
 * "Pieza Entregada" (misma regla que el original).
 */
export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const body = (await req.json()) as { pedidos: string[]; estado: string; recibidoPor?: string };
  if (!Array.isArray(body.pedidos) || body.pedidos.length === 0) {
    return NextResponse.json({ ok: false, error: "Selecciona al menos un pedido" }, { status: 400 });
  }
  if (!body.estado?.trim()) {
    return NextResponse.json({ ok: false, error: "Falta el estado" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<{
      ok: boolean;
      pedidos: Record<string, unknown>[];
      reparaciones: Record<string, unknown>[];
    }>("/v1/pedidos/cambiar-estado-masivo", {
      requestId: crypto.randomUUID(),
      usuario,
      estado: body.estado,
      pedidos: body.pedidos,
      ...(body.recibidoPor ? { datos: { recibidoPor: body.recibidoPor } } : {}),
    });
    return NextResponse.json({ ok: true, pedidos: resultado.pedidos, reparaciones: resultado.reparaciones });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
