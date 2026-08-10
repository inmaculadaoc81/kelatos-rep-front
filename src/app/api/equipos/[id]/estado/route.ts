import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { EstadoEquipo } from "@/lib/equipos";

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
  const { nuevoEstado } = (await req.json()) as { nuevoEstado: EstadoEquipo };
  if (!["DISPONIBLE", "MANTENIMIENTO", "FUERA_SERVICIO", "VENDIDO"].includes(nuevoEstado)) {
    return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
  }

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, id, nuevoEstado });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; equipo: Record<string, unknown> }>(
      `/v1/equipos/${encodeURIComponent(id)}/estado`,
      { requestId, usuario, payloadHash, nuevoEstado }
    );
    return NextResponse.json({ ok: true, equipo: resultado.equipo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
