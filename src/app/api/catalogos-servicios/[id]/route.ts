import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearCatalogoServicios } from "@/lib/catalogos-servicios";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const datos = await req.json();
  try {
    const resultado = await kelatosApiPost<{ ok: boolean; catalogo: Parameters<typeof mapearCatalogoServicios>[0] }>(
      `/v1/catalogos-servicios/${encodeURIComponent(id)}`,
      datos,
      "PATCH"
    );
    return NextResponse.json({ ok: true, catalogo: mapearCatalogoServicios(resultado.catalogo) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    await kelatosApiPost<{ ok: boolean }>(`/v1/catalogos-servicios/${encodeURIComponent(id)}`, {}, "DELETE");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
