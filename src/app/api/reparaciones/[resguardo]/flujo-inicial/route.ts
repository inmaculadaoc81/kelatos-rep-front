import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Proxy de POST /v1/reparaciones/:resguardo/flujo-inicial (marcarComoGarantia
 * / abrirModalIniciarReparacion+confirmarIniciarReparacion del original) —
 * ambas acciones ya viven en el mismo endpoint transaccional del backend.
 */
type AccionFlujoInicial = "marcar_garantia" | "iniciar_reparacion";

interface RespuestaFlujoInicial {
  ok: boolean;
  reparacion: Record<string, unknown>;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const { accion, datos } = (await req.json()) as { accion: AccionFlujoInicial; datos?: Record<string, unknown> };

  if (accion !== "marcar_garantia" && accion !== "iniciar_reparacion") {
    return NextResponse.json({ ok: false, error: "acción no reconocida" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaFlujoInicial>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/flujo-inicial`,
      { requestId: crypto.randomUUID(), usuario, accion, datos: datos || {} }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
