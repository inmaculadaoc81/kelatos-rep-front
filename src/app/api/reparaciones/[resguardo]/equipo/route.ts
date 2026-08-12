import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

export interface DatosEditarEquipo {
  modelo: string;
  sintoma: string;
}

interface RespuestaEquipo {
  ok: boolean;
  row: {
    equipo_modelo: string;
    sintoma: string;
  };
}

/** Proxy de PATCH /v1/reparaciones/:resguardo/equipo (guardarEditarEquipo del original). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const datos = (await req.json()) as DatosEditarEquipo;

  if (!datos.modelo?.trim()) return NextResponse.json({ ok: false, error: "El modelo del equipo es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<RespuestaEquipo>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/equipo`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        modelo: datos.modelo.trim(),
        sintoma: datos.sintoma.trim(),
      },
      "PATCH"
    );

    return NextResponse.json({
      ok: true,
      equipo: { modelo: resultado.row.equipo_modelo, sintoma: resultado.row.sintoma },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
