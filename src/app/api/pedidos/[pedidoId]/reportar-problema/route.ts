import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Proxy de POST /v1/pedidos/:pedidoId/reportar-problema (guardarProblemaPieza
 * del original) — marca un pedido "Recibido" como Defectuosa/Rota y crea de
 * inmediato el pedido de reemplazo con sus propios proveedor/enlace/número/
 * fecha estimada, pasando la reparación a "Pieza Pendiente". El backend ya
 * existía (Fase de migración anterior) sin ningún llamador en el frontend.
 */
export async function POST(req: Request, { params }: { params: Promise<{ pedidoId: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { pedidoId } = await params;
  const body = (await req.json()) as {
    tipoProblema?: string;
    codigoDevolucion?: string;
    descripcion?: string;
    nuevoProveedor?: string;
    nuevoEnlace?: string;
    nuevoNumeroPedido?: string;
    nuevaFechaEstimada?: string;
    piezaId?: string;
  };

  try {
    const resultado = await kelatosApiPost<{
      ok: boolean;
      pedidoAnterior: Record<string, unknown>;
      pedidoReemplazo: Record<string, unknown>;
      reparacion: Record<string, unknown>;
    }>(`/v1/pedidos/${encodeURIComponent(pedidoId)}/reportar-problema`, {
      requestId: crypto.randomUUID(),
      usuario,
      tipoProblema: body.tipoProblema || "defectuosa",
      codigoDevolucion: body.codigoDevolucion || "",
      descripcion: body.descripcion || "",
      nuevoProveedor: body.nuevoProveedor || "",
      nuevoEnlace: body.nuevoEnlace || "",
      nuevoNumeroPedido: body.nuevoNumeroPedido || "",
      nuevaFechaEstimada: body.nuevaFechaEstimada || "",
      piezaId: body.piezaId || "",
    });
    return NextResponse.json({
      ok: true,
      pedidoAnterior: resultado.pedidoAnterior,
      pedidoReemplazo: resultado.pedidoReemplazo,
      reparacion: resultado.reparacion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
