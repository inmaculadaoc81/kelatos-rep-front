import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { equipoId, motivo } = (await req.json()) as { equipoId: string; motivo: string };
  if (!equipoId) return NextResponse.json({ ok: false, error: "equipoId es obligatorio" }, { status: 400 });
  if (!motivo?.trim()) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; alquiler: Record<string, unknown> }>(
      `/v1/alquileres/${encodeURIComponent(id)}/devolver-sin-factura`,
      { requestId: crypto.randomUUID(), usuario, equipoId, motivo: motivo.trim() }
    );
    return NextResponse.json({ ok: true, alquiler: resultado.alquiler });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
