import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearVenta, mapearItem, DatosNuevoItem } from "@/lib/ventas";

/** Reproduce confirmarAgregarItem() — añade una pieza a una venta ya existente. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ ventaId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { ventaId } = await params;
  const datos = (await req.json()) as DatosNuevoItem;
  if (!datos.descripcion?.trim()) return NextResponse.json({ ok: false, error: "La descripción es obligatoria" }, { status: 400 });
  if (!datos.costo || datos.costo <= 0) return NextResponse.json({ ok: false, error: "El costo es obligatorio" }, { status: 400 });
  if (!datos.precio || datos.precio <= 0) return NextResponse.json({ ok: false, error: "El precio es obligatorio" }, { status: 400 });
  if (!datos.proveedorId) return NextResponse.json({ ok: false, error: "El proveedor es obligatorio" }, { status: 400 });
  if (!datos.enlace?.trim()) return NextResponse.json({ ok: false, error: "El enlace es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; item_id: string; item: Parameters<typeof mapearVenta>[1][number] }>(
      `/v1/ventas/${encodeURIComponent(ventaId)}/items`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        descripcion: datos.descripcion.trim(),
        costo: datos.costo,
        precio: datos.precio,
        proveedor_id: datos.proveedorId,
        enlace: datos.enlace.trim(),
      }
    );
    return NextResponse.json({ ok: true, item: mapearItem(resultado.item) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
