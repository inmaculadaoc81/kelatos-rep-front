import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearFacturaRecibida } from "@/lib/facturas-recibidas";

/** Enlaza la factura a un pedido de servicio o de stock (una factura puede cubrir varios). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { pedidoId?: string; stockPedidoId?: number };
  try {
    const data = await kelatosApiPost<{ ok: boolean; factura: Parameters<typeof mapearFacturaRecibida>[0] }>(
      `/v1/facturas-recibidas/${encodeURIComponent(id)}/enlaces`,
      { pedidoId: body.pedidoId, stockPedidoId: body.stockPedidoId }
    );
    return NextResponse.json({ ok: true, factura: mapearFacturaRecibida(data.factura) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
