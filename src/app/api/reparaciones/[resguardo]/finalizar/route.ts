import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosFinalizarReparacion } from "@/lib/reparacion-finalizar";

interface RespuestaFinalizar {
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
  const datos = (await req.json()) as DatosFinalizarReparacion;

  if (!datos.tecnico?.trim() || !datos.fecha) {
    return NextResponse.json({ ok: false, error: "Técnico y fecha son obligatorios" }, { status: 400 });
  }
  if (datos.resultado === "no_reparado" && !datos.motivoSinReparacion?.trim()) {
    return NextResponse.json({ ok: false, error: "El motivo por el que no tiene reparación es obligatorio" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaFinalizar>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/finalizar`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        datos: {
          tecnico: datos.tecnico.trim(),
          resultado: datos.resultado,
          fecha: datos.fecha,
          observacion: datos.observaciones.trim(),
          motivoSinReparacion: datos.motivoSinReparacion.trim(),
          piezaOk: datos.piezaOk,
          piezaNoResuelve: datos.piezaNoResuelve,
          codigoDevolucion: datos.codigoDevolucion.trim(),
          minutosNotificacion: datos.minutosNotificacion,
          pesoArchivo: datos.pesoArchivo.trim(),
        },
      }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
