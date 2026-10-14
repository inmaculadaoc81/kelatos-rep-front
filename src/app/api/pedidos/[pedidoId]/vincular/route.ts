import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { numeroPedidoEsEnlace, MENSAJE_NUMERO_PEDIDO_ENLACE } from "@/lib/numero-pedido";

/**
 * POST /api/pedidos/[pedidoId]/vincular — enlaza un pedido de reparación que YA está registrado (y normalmente ya
 * recibido) con el pedido real del proveedor, SIN cambiar su estado: anota el nº de pedido real y, si se pide, el
 * coste realmente pagado. Sirve cuando llega la factura de un pedido que se había dado de alta a mano con un nº
 * provisional ("añadido"). A diferencia de registrar el pedido de nuevo, no lo devuelve a "En Tránsito" ni crea otro.
 * Usa la actualización genérica de la tabla pedidos del servidor.
 */
export async function POST(req: Request, { params }: { params: Promise<{ pedidoId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { pedidoId } = await params;
  if (!/^PED-\d+$/.test(pedidoId)) return NextResponse.json({ ok: false, error: "Pedido no válido" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { numeroPedido?: string; costo?: number };
  const numeroPedido = (body.numeroPedido || "").trim();
  if (!numeroPedido) return NextResponse.json({ ok: false, error: "El Nº de pedido es obligatorio" }, { status: 400 });
  if (numeroPedidoEsEnlace(numeroPedido)) return NextResponse.json({ ok: false, error: MENSAJE_NUMERO_PEDIDO_ENLACE }, { status: 400 });

  const cambios: Record<string, string | number> = { numero_pedido: numeroPedido };
  if (typeof body.costo === "number" && body.costo > 0) cambios.costo = Math.round(body.costo * 100) / 100;

  try {
    await kelatosApiPost(`/v1/pedidos/${encodeURIComponent(pedidoId)}`, cambios, "PATCH");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
