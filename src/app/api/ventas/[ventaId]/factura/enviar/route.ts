import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Botón "Enviar al cliente" de la FACTURA REAL (Serie 1/3) de un pedido de
 * piezas — mismo proxy que /api/ventas/[ventaId]/ticket-venta/enviar y que
 * /api/reparaciones/[resguardo]/facturas/enviar, contra el endpoint
 * equivalente para kelatos_app.ventas. Hueco encontrado el 2026-09-11: la
 * pestaña PDF/Enviar de VentaFacturaModalShell existía pero pasaba
 * enviarUrl={null} porque esta ruta nunca se había construido.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ ventaId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { ventaId } = await params;
  const body = (await req.json()) as { tipo?: string; emailDestino?: string };

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; enviado: boolean; motivo?: string }>(
      `/v1/ventas/${encodeURIComponent(ventaId)}/factura/enviar`,
      { tipo: body.tipo || "normal", emailDestino: body.emailDestino || "" }
    );
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
