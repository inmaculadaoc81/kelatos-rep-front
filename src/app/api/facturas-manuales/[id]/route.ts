import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapFacturaManualDetalle } from "@/lib/factura-manual";
import { esSuperadmin } from "@/lib/superadmin";

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

/** Borrado real desde el dashboard — restringido al superadmin. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (!esSuperadmin(email)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { motivo?: string };
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  if (!motivo) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });

  try {
    const data = await kelatosApiPost<{ ok: boolean; eliminado: boolean; tieneFacturaReal: boolean }>(
      `/v1/facturas-manuales/${encodeURIComponent(id)}`,
      { usuario: email, motivo },
      "DELETE"
    );
    return NextResponse.json({ ok: true, eliminado: data.eliminado, tieneFacturaReal: data.tieneFacturaReal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
