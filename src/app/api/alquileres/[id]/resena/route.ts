import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Proxy de POST /v1/alquileres/:id/resena — mismo mecanismo que
 * /api/reparaciones/[resguardo]/resena, copiado para alquileres: "programar"
 * agenda el envío real por WhatsApp a 7 días; "cancelar" anula ese envío
 * programado; "marcar_si" registra que ya se pidió en persona sin programar
 * nada.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { accion } = (await req.json()) as { accion: "programar" | "cancelar" | "marcar_si" };
  if (!["programar", "cancelar", "marcar_si"].includes(accion)) {
    return NextResponse.json({ ok: false, error: "acción no reconocida" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; alquiler: { alquiler_id: string; resena: string } }>(
      `/v1/alquileres/${encodeURIComponent(id)}/resena`,
      { requestId: crypto.randomUUID(), usuario, accion }
    );
    return NextResponse.json({ ok: true, alquiler: resultado.alquiler });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
