import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

interface RespuestaObservaciones {
  ok: boolean;
  row: { observaciones: string };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const { texto } = (await req.json()) as { texto: string };
  if (!texto?.trim()) return NextResponse.json({ ok: false, error: "El texto de la observación es obligatorio" }, { status: 400 });
  if (texto.trim().length > 2000) return NextResponse.json({ ok: false, error: "La observación no puede superar los 2000 caracteres" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<RespuestaObservaciones>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/observaciones`,
      { requestId: crypto.randomUUID(), usuario, texto: texto.trim() }
    );

    return NextResponse.json({ ok: true, observaciones: resultado.row.observaciones });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
