import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

type AccionEstadoEspecial = "sin_reparacion_pieza" | "deshacer_sin_reparacion" | "revertir_abandonado";

interface RespuestaEstadosEspeciales {
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
  const { accion, datos } = (await req.json()) as { accion: AccionEstadoEspecial; datos?: Record<string, unknown> };

  if (!["sin_reparacion_pieza", "deshacer_sin_reparacion", "revertir_abandonado"].includes(accion)) {
    return NextResponse.json({ ok: false, error: "acción no reconocida" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaEstadosEspeciales>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/estados-especiales`,
      { requestId: crypto.randomUUID(), usuario, accion, datos: datos || {} }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
