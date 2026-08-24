import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearProducto, DatosProductoForm } from "@/lib/productos";

interface RespuestaLecturaProductos {
  ok: boolean;
  productos: Parameters<typeof mapearProducto>[0][];
}

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaLecturaProductos>("/v1/lecturas/productos");
    return NextResponse.json({ ok: true, productos: data.productos.map(mapearProducto) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = (await req.json()) as DatosProductoForm;
  if (!datos.nombre?.trim()) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; producto: Parameters<typeof mapearProducto>[0] }>("/v1/productos", {
      requestId: crypto.randomUUID(),
      usuario,
      nombre: datos.nombre.trim(),
      referencia: datos.referencia.trim(),
      categoria: datos.categoria.trim(),
      stockActual: datos.stockActual,
      unidad: datos.unidad.trim() || "uds",
      stockMinimo: datos.stockMinimo,
      precioCompra: datos.precioCompra,
      precioVenta: datos.precioVenta,
      proveedor: datos.proveedor.trim(),
      ubicacion: datos.ubicacion.trim(),
      notas: datos.notas.trim(),
      origenResguardo: datos.origenResguardo?.trim() || undefined,
    });

    return NextResponse.json({ ok: true, producto: mapearProducto(resultado.producto) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
