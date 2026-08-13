import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapFacturaManualDetalle } from "@/lib/factura-manual";

/**
 * Proxy de GET /v1/facturas-manuales/:id (kelatos-rep-back), ya existente
 * sin ningún llamador hasta ahora. Alimenta el modal con tabs (PDF/Enviar,
 * Devolución, Rectificativo) de una factura manual.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; facturaManual: Parameters<typeof mapFacturaManualDetalle>[0] }>(
      `/v1/facturas-manuales/${encodeURIComponent(id)}`
    );
    return NextResponse.json({ ok: true, detalle: mapFacturaManualDetalle(data.facturaManual) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
