import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Cancela un pedido pendiente (no lo borra — queda en el historial con estado "cancelado"). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    await kelatosApiPost<{ ok: boolean; cancelado: boolean }>(`/v1/stock-piezas/pedidos/${encodeURIComponent(id)}`, {}, "DELETE");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
