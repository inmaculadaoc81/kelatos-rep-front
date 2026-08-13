import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearCliente, ClienteFormData } from "@/lib/clientes";

interface RespuestaGenericaCliente {
  ok: boolean;
  row: Parameters<typeof mapearCliente>[0];
}

const SUPERADMIN_EMAIL = "kelatoscielo@gmail.com";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { codigo } = await params;
  const datos = (await req.json()) as ClienteFormData;
  if (!datos.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<RespuestaGenericaCliente>(
      `/v1/clientes/${encodeURIComponent(codigo)}`,
      {
        nombre: datos.nombre.trim(),
        dni_cif: datos.dniCif.trim() || null,
        telefono: datos.telefono.trim(),
        email: datos.email.trim(),
        direccion: datos.direccion.trim(),
        cp: datos.cp.trim(),
        localidad: datos.localidad.trim(),
        provincia: datos.provincia.trim(),
        notas: datos.notas.trim(),
      },
      "PATCH"
    );

    return NextResponse.json({ ok: true, cliente: mapearCliente(resultado.row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/** Borrado real desde el dashboard — restringido al superadmin. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  if (email !== SUPERADMIN_EMAIL) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });

  const { codigo } = await params;
  const body = (await req.json().catch(() => ({}))) as { motivo?: string };
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  if (!motivo) return NextResponse.json({ ok: false, error: "El motivo es obligatorio" }, { status: 400 });

  try {
    const data = await kelatosApiPost<{ ok: boolean; eliminado: boolean; tieneFacturaReal: boolean }>(
      `/v1/clientes/${encodeURIComponent(codigo)}`,
      { usuario: email, motivo },
      "DELETE"
    );
    return NextResponse.json({ ok: true, eliminado: data.eliminado, tieneFacturaReal: data.tieneFacturaReal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
