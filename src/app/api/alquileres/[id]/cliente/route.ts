import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { DatosClienteAlquiler } from "@/lib/equipos";

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
  const datos = (await req.json()) as DatosClienteAlquiler;
  if (!datos.clienteNombre) return NextResponse.json({ ok: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
  if (!datos.clienteTelefono) return NextResponse.json({ ok: false, error: "El teléfono es obligatorio" }, { status: 400 });
  if (!datos.clienteDNI) return NextResponse.json({ ok: false, error: "El DNI es obligatorio" }, { status: 400 });
  if (!datos.clienteEmail) return NextResponse.json({ ok: false, error: "El email es obligatorio" }, { status: 400 });

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, id, datos });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; alquiler: Record<string, unknown> }>(
      `/v1/alquileres/${encodeURIComponent(id)}/cliente`,
      {
        requestId,
        usuario,
        payloadHash,
        clienteNombre: datos.clienteNombre,
        clienteTelefono: datos.clienteTelefono,
        clienteDNI: datos.clienteDNI,
        clienteEmail: datos.clienteEmail,
        clienteDireccion: datos.clienteDireccion,
        reenviarEmail: datos.reenviarEmail === true,
      }
    );
    return NextResponse.json({ ok: true, alquiler: resultado.alquiler });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
