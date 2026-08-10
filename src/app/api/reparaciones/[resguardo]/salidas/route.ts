import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosMarcarEntregado } from "@/lib/reparacion-finalizar";

interface RespuestaSalidas {
  ok: boolean;
  reparacion: Record<string, unknown>;
  diasTotales: number;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const datos = (await req.json()) as DatosMarcarEntregado;

  if (!datos.fechaRecogida) {
    return NextResponse.json({ ok: false, error: "La fecha de recogida es obligatoria" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaSalidas>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/salidas`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        accion: "marcar_entregado",
        datos: {
          fechaRecogida: datos.fechaRecogida,
          tipoEntrega: datos.tipoEntrega,
          numeroFactura: datos.numeroFactura.trim() || undefined,
          resena: datos.resena,
          observaciones: datos.observaciones.trim(),
        },
      }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion, diasTotales: resultado.diasTotales });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
