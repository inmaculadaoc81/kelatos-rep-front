import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const resultado = await kelatosApiPost<{ ok: boolean; pedido: Record<string, unknown> }>(
      `/v1/stock-piezas/pedidos/${encodeURIComponent(id)}/recibido`,
      { usuario }
    );
    return NextResponse.json({ ok: true, pedido: resultado.pedido });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
