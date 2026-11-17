import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Botón «Enviar al cliente» / «Enviar a otro correo» de la factura de un alquiler — proxy a POST /v1/alquileres/:id/facturas/enviar.
 * El backend descarga el PDF real de Drive y lo adjunta; `numeroFactura` indica qué factura del alquiler se envía (principal, rectificativa, corregida…).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { tipo?: string; emailDestino?: string; numeroFactura?: string };

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; enviado: boolean; motivo?: string }>(
      `/v1/alquileres/${encodeURIComponent(id)}/facturas/enviar`,
      { tipo: body.tipo || "normal", numeroFactura: body.numeroFactura || "", emailDestino: body.emailDestino || "", usuario: session.user.email }
    );
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
