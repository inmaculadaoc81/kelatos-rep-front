import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearItem, DatosEditarItem } from "@/lib/ventas";

/** Reproduce guardarEdicionItemUI() — solo descripción/costo/precio, igual que el original. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { itemId } = await params;
  const datos = (await req.json()) as DatosEditarItem;
  if (!datos.descripcion?.trim()) return NextResponse.json({ ok: false, error: "La descripción es obligatoria" }, { status: 400 });
  if (!datos.precio || datos.precio <= 0) return NextResponse.json({ ok: false, error: "El precio debe ser mayor a 0" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; item: Parameters<typeof mapearItem>[0] }>(
      `/v1/items-venta/${encodeURIComponent(itemId)}`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        cambios: { descripcion: datos.descripcion.trim(), costo: datos.costo, precio: datos.precio },
      },
      "PATCH"
    );
    return NextResponse.json({ ok: true, item: mapearItem(resultado.item) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/** Reproduce eliminarItemUI(). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { itemId } = await params;
  try {
    await kelatosApiPost(
      `/v1/items-venta/${encodeURIComponent(itemId)}`,
      { requestId: crypto.randomUUID(), usuario },
      "DELETE"
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
