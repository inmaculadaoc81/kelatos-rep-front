import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Proxy de POST /v1/pedidos/:pedidoId/estado-plataforma — anotación manual
 * de lo que dice la página de seguimiento del proveedor/mensajería (sin
 * integración automática con ningún proveedor). Petición del usuario,
 * 2026-10-07: para detectar en Compras los pedidos marcados "Recibido"
 * internamente sin que la plataforma confirme la entrega.
 */
export async function POST(req: Request, { params }: { params: Promise<{ pedidoId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { pedidoId } = await params;
  const body = (await req.json().catch(() => ({}))) as { estadoPlataforma?: string };

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; pedido: Record<string, unknown> }>(
      `/v1/pedidos/${encodeURIComponent(pedidoId)}/estado-plataforma`,
      { estadoPlataforma: body.estadoPlataforma || "" }
    );
    return NextResponse.json({ ok: true, pedido: resultado.pedido });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
