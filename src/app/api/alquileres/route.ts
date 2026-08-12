import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosNuevoAlquiler } from "@/lib/equipos";

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { equipoId, datos } = (await req.json()) as { equipoId: string; datos: DatosNuevoAlquiler };
  if (!equipoId) return NextResponse.json({ ok: false, error: "equipoId es obligatorio" }, { status: 400 });
  if (!datos.clienteNombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (!datos.clienteTelefono?.trim()) return NextResponse.json({ ok: false, error: "El teléfono es obligatorio" }, { status: 400 });
  if (!datos.clienteDNI?.trim()) return NextResponse.json({ ok: false, error: "El DNI es obligatorio" }, { status: 400 });
  if (datos.meses + datos.semanas + datos.dias <= 0) {
    return NextResponse.json({ ok: false, error: "Indica al menos 1 día, semana o mes" }, { status: 400 });
  }

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, equipoId, datos });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; alquiler: Record<string, unknown>; total: number }>("/v1/alquileres/crear", {
      requestId,
      usuario,
      payloadHash,
      equipoId,
      clienteNombre: datos.clienteNombre.trim(),
      clienteTelefono: datos.clienteTelefono.trim(),
      clienteDNI: datos.clienteDNI.trim(),
      clienteEmail: datos.clienteEmail.trim(),
      clienteDireccion: datos.clienteDireccion.trim(),
      fechaInicio: datos.fechaInicio,
      fechaFinPrevista: datos.fechaFinPrevista,
      meses: datos.meses,
      semanas: datos.semanas,
      dias: datos.dias,
      metodoPago: datos.metodoPago,
      observaciones: datos.observaciones.trim(),
      envioActivado: datos.envioActivado === true,
      recogidaActivada: datos.recogidaActivada === true,
    });

    return NextResponse.json({ ok: true, alquiler: resultado.alquiler, alquilerId: resultado.alquiler.alquiler_id, total: resultado.total });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
