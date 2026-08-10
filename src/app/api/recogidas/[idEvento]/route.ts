import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearRecogida, DatosEditarRecogida, Recogida } from "@/lib/recogidas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ idEvento: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { idEvento } = await params;
  const { datos, actual } = (await req.json()) as { datos: DatosEditarRecogida; actual: Recogida };

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; recogida: Parameters<typeof mapearRecogida>[0] }>(
      `/v1/recogidas/${encodeURIComponent(idEvento)}`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        nuevoEstado: datos.nuevoEstado,
        datos: {
          fecha: actual.fecha,
          hora: actual.hora,
          nombreCliente: actual.cliente,
          asunto: actual.asunto,
          telefono: actual.telefono,
          email: actual.email,
          direccion: actual.direccion,
          notas: actual.notas,
          numeroSeguimiento: datos.numeroSeguimiento.trim(),
          observaciones: datos.observaciones.trim(),
        },
      },
      "PATCH"
    );

    return NextResponse.json({ ok: true, recogida: mapearRecogida(resultado.recogida) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
