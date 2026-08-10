import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearProducto, DatosProductoForm } from "@/lib/productos";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const datos = (await req.json()) as DatosProductoForm;
  if (!datos.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; producto: Parameters<typeof mapearProducto>[0] }>(
      `/v1/productos/${encodeURIComponent(id)}`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        cambios: {
          nombre: datos.nombre.trim(),
          referencia: datos.referencia.trim(),
          categoria: datos.categoria.trim(),
          unidad: datos.unidad.trim() || "uds",
          stock_minimo: datos.stockMinimo,
          precio_compra: datos.precioCompra,
          precio_venta: datos.precioVenta,
          proveedor: datos.proveedor.trim(),
          ubicacion: datos.ubicacion.trim(),
          notas: datos.notas.trim(),
        },
      },
      "PATCH"
    );

    return NextResponse.json({ ok: true, producto: mapearProducto(resultado.producto) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
