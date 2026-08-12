import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export interface DatosEditarCliente {
  nombre: string;
  telefono: string;
  email: string;
  dniCif: string;
  direccionEnvio: string;
}

interface RespuestaCliente {
  ok: boolean;
  row: {
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_email: string;
    dni_cif: string;
    direccion_envio: string;
  };
}

/** Proxy de PATCH /v1/reparaciones/:resguardo/cliente (guardarEditarCliente del original). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const datos = (await req.json()) as DatosEditarCliente;

  if (!datos.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<RespuestaCliente>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/cliente`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        nombre: datos.nombre.trim(),
        telefono: datos.telefono.trim(),
        email: datos.email.trim(),
        dniCif: datos.dniCif.trim(),
        direccionEnvio: datos.direccionEnvio.trim(),
      },
      "PATCH"
    );

    return NextResponse.json({
      ok: true,
      cliente: {
        nombre: resultado.row.cliente_nombre,
        telefono: resultado.row.cliente_telefono,
        email: resultado.row.cliente_email,
        dniCif: resultado.row.dni_cif,
        direccionEnvio: resultado.row.direccion_envio,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
