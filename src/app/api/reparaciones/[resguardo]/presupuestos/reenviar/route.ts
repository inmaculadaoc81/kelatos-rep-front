import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Reproduce reenviarEmailPresupuesto() (Presupuestos.js, Apps Script) —
 * reenvía por email los presupuestos ya enviados (o borradores añadidos
 * después) sin tocar la numeración fiscal ni el estado. No forma parte
 * del saga preparar/iniciar/confirmar, así que no lleva requestId.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; mensaje: string }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/presupuestos/reenviar-email`,
      { usuario }
    );
    return NextResponse.json({ ok: true, mensaje: resultado.mensaje });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
