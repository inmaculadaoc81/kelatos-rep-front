import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearFacturaRecibida } from "@/lib/facturas-recibidas";

/** Sube la imagen/PDF de la factura a Drive (mismo patrón que fotos de
    reparación) — el frontend manda el archivo ya en base64. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { base64?: string; mimeType?: string; nombre?: string };
  if (!body.base64 || !body.mimeType) return NextResponse.json({ ok: false, error: "Faltan datos del archivo" }, { status: 400 });

  try {
    const data = await kelatosApiPost<{ ok: boolean; factura: Parameters<typeof mapearFacturaRecibida>[0] }>(
      `/v1/facturas-recibidas/${id}/archivo`,
      body
    );
    return NextResponse.json({ ok: true, factura: mapearFacturaRecibida(data.factura) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
