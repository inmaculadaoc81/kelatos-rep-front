import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearFacturaRecibida } from "@/lib/facturas-recibidas";

/** Quita un enlace factura ↔ pedido. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; enlaceId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id, enlaceId } = await params;
  try {
    const data = await kelatosApiPost<{ ok: boolean; factura: Parameters<typeof mapearFacturaRecibida>[0] }>(
      `/v1/facturas-recibidas/${encodeURIComponent(id)}/enlaces/${encodeURIComponent(enlaceId)}`,
      {},
      "DELETE"
    );
    return NextResponse.json({ ok: true, factura: mapearFacturaRecibida(data.factura) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
