import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";
import { mapAlquilerFacturaDetalle } from "@/lib/alquiler-detalle";

/**
 * Proxy de lectura de GET /v1/alquileres/:id (kelatos-rep-back), ya usado
 * internamente por /api/alquileres/[id]/facturas — aquí expuesto tal cual
 * para alimentar el modal con tabs (PDF/Enviar + Devolución) de Facturas
 * de Clientes.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; alquiler: Parameters<typeof mapAlquilerFacturaDetalle>[0] }>(
      `/v1/alquileres/${encodeURIComponent(id)}`
    );
    return NextResponse.json({ ok: true, detalle: mapAlquilerFacturaDetalle(data.alquiler) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
