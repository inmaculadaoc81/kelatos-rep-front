import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosDevolucion } from "@/lib/equipos";

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { equipoId, datos } = (await req.json()) as { equipoId: string; datos: DatosDevolucion };
  if (!equipoId) return NextResponse.json({ ok: false, error: "equipoId es obligatorio" }, { status: 400 });
  if (!datos.fechaDevolucion) return NextResponse.json({ ok: false, error: "La fecha de devolución es obligatoria" }, { status: 400 });

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, id, equipoId, datos });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; alquiler: Record<string, unknown> }>(
      `/v1/alquileres/${encodeURIComponent(id)}/devolver`,
      {
        requestId,
        usuario,
        payloadHash,
        equipoId,
        fechaDevolucion: datos.fechaDevolucion,
        totalCobrado: datos.totalCobrado,
        fianzaDevuelta: datos.fianzaDevuelta,
        estadoDevolucion: datos.estadoDevolucion,
        descuentoDanos: datos.descuentoDanos,
        diasDiferencia: datos.diasDiferencia,
      }
    );
    return NextResponse.json({ ok: true, alquiler: resultado.alquiler });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
