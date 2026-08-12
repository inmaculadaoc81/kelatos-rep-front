import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Proxy de POST /v1/reparaciones/:resguardo/resena — reproduce
 * _vfProgramarResena()/_vfCancelarResena()/_vfResenaChange() (Index.html):
 * "programar" agenda el envío real por WhatsApp a 7 días (mismo webhook de
 * n8n que usaba Encuestas.js, ahora vía el poller del backend); "cancelar"
 * anula ese envío programado; "marcar_si" registra que ya se pidió en
 * persona sin programar nada.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const { accion } = (await req.json()) as { accion: "programar" | "cancelar" | "marcar_si" };
  if (!["programar", "cancelar", "marcar_si"].includes(accion)) {
    return NextResponse.json({ ok: false, error: "acción no reconocida" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; reparacion: { resguardo: string; resena: string } }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/resena`,
      { requestId: crypto.randomUUID(), usuario, accion }
    );
    return NextResponse.json({ ok: true, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
