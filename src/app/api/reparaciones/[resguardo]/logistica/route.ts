import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

type AccionLogistica = "entrega_mensajeria" | "equipo_en_local" | "equipo_recibido";

interface RespuestaLogistica {
  ok: boolean;
  reparacion: { resguardo: string; entrega_mensajeria: string; direccion_envio: string; equipo_en_local: string };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const { accion, datos } = (await req.json()) as { accion: AccionLogistica; datos?: Record<string, unknown> };

  if (!["entrega_mensajeria", "equipo_en_local", "equipo_recibido"].includes(accion)) {
    return NextResponse.json({ ok: false, error: "acción no reconocida" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaLogistica>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/logistica`,
      { requestId: crypto.randomUUID(), usuario, accion, datos: datos || {} }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
