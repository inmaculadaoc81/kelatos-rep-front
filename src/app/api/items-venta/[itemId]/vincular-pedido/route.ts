import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearItem } from "@/lib/ventas";
import { numeroPedidoEsEnlace, MENSAJE_NUMERO_PEDIDO_ENLACE } from "@/lib/numero-pedido";

/**
 * POST /api/items-venta/[itemId]/vincular-pedido — enlaza una pieza de una venta con un pedido real al proveedor
 * SIN cambiar su estado: solo anota el nº de pedido, el proveedor y (si se indica) el enlace. Sirve para piezas de
 * una venta que ya se recibieron y vendieron (p. ej. figuraban con "AÑADIDO" como nº de pedido) cuando luego se
 * lee el pedido real con "Subir pedido con IA". A diferencia de /registrar-pedido, no la pasa a "En Tránsito" ni
 * toca fechas, coste o precio. Usa el PATCH genérico de items-venta del servidor.
 */
export async function POST(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { itemId } = await params;
  const datos = (await req.json().catch(() => ({}))) as { proveedorId?: string; numeroPedido?: string; enlace?: string };
  const numeroPedido = (datos.numeroPedido || "").trim();
  if (!numeroPedido) return NextResponse.json({ ok: false, error: "El Nº de pedido es obligatorio" }, { status: 400 });
  if (numeroPedidoEsEnlace(numeroPedido)) return NextResponse.json({ ok: false, error: MENSAJE_NUMERO_PEDIDO_ENLACE }, { status: 400 });

  const cambios: Record<string, string> = { numero_pedido: numeroPedido };
  if (datos.proveedorId?.trim()) cambios.proveedor_id = datos.proveedorId.trim();
  if (datos.enlace?.trim()) cambios.enlace = datos.enlace.trim();

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; item: Parameters<typeof mapearItem>[0] }>(
      `/v1/items-venta/${encodeURIComponent(itemId)}`,
      { requestId: crypto.randomUUID(), usuario, cambios },
      "PATCH"
    );
    return NextResponse.json({ ok: true, item: mapearItem(resultado.item) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
