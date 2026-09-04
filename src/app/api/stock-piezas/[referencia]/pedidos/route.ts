import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

interface FilaPedidoSql {
  id: number;
  referencia: string;
  enlace_id: number | null;
  proveedor: string | null;
  enlace: string | null;
  cantidad: number;
  fecha_pedido: string | null;
  fecha_estimada_llegada: string | null;
  estado: string;
  fecha_recibido: string | null;
  usuario: string | null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { referencia } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; pedidos: FilaPedidoSql[] }>(
      `/v1/stock-piezas/${encodeURIComponent(referencia)}/pedidos`
    );
    return NextResponse.json({ ok: true, pedidos: resultado.pedidos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { referencia } = await params;
  const { enlaceId, cantidad, fechaEstimadaLlegada } = (await req.json()) as {
    enlaceId?: number | null;
    cantidad: number;
    fechaEstimadaLlegada?: string;
  };
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return NextResponse.json({ ok: false, error: "La cantidad debe ser mayor que 0" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; pedido: FilaPedidoSql }>(
      `/v1/stock-piezas/${encodeURIComponent(referencia)}/pedidos`,
      { enlaceId: enlaceId ?? null, cantidad, fechaEstimadaLlegada: fechaEstimadaLlegada || null, usuario }
    );
    return NextResponse.json({ ok: true, pedido: resultado.pedido });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
