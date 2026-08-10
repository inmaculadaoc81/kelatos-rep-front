import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface RespuestaRechazarFormulario {
  ok: boolean;
  resguardo: string;
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
  const { motivo } = (await req.json()) as { motivo: string };
  if (!motivo?.trim()) return NextResponse.json({ ok: false, error: "El motivo del rechazo es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<RespuestaRechazarFormulario>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/formulario/rechazar`,
      { requestId: crypto.randomUUID(), usuario, motivo: motivo.trim() }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
