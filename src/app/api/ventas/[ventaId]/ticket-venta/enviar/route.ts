import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Botón "Enviar al cliente" para tickets de Ventas (petición del usuario,
 * 2026-08-28) — mismo proxy que /api/reparaciones/[resguardo]/ticket-venta/
 * enviar, contra el endpoint equivalente para kelatos_app.ventas.
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
      `/v1/ventas/${encodeURIComponent(ventaId)}/ticket-venta/enviar`,
      { tipo: body.tipo || "ticket", emailDestino: body.emailDestino || "" }
    );
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
