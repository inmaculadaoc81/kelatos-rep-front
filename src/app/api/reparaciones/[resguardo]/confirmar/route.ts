import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosConfirmarFormulario } from "@/lib/reparacion-confirmar";

interface RespuestaConfirmarFormulario {
  ok: boolean;
  resguardo: string;
  reparacion: Record<string, unknown>;
  nuevoEstado: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const datos = (await req.json()) as DatosConfirmarFormulario;

  if (!datos.clienteNombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (!datos.equipoModelo?.trim()) return NextResponse.json({ ok: false, error: "El modelo del equipo es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<RespuestaConfirmarFormulario>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/formulario/confirmar`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        datos: {
          clienteNombre: datos.clienteNombre.trim(),
          clienteTelefono: datos.clienteTelefono.trim(),
          clienteEmail: datos.clienteEmail.trim(),
          direccionEnvio: datos.direccionEnvio.trim(),
          equipoModelo: datos.equipoModelo.trim(),
          sintoma: datos.sintoma.trim(),
          estado: datos.estado,
          tipoRecepcion: datos.tipoRecepcion,
          entregaMensajeria: datos.entregaMensajeria ? "SI" : "NO",
          revisionPagada: datos.revisionPagada,
        },
      }
    );

    return NextResponse.json({ ok: true, reparacion: resultado.reparacion, nuevoEstado: resultado.nuevoEstado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
