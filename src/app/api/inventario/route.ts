import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearMovimiento, mapearProducto, DatosMovimiento } from "@/lib/productos";

interface RespuestaLecturaInventario {
  ok: boolean;
  movimientos: Parameters<typeof mapearMovimiento>[0][];
}

export async function GET() {
  try {
    const data = await kelatosApiGet<RespuestaLecturaInventario>("/v1/lecturas/inventario", { limit: 500 });
    return NextResponse.json({ ok: true, movimientos: data.movimientos.map(mapearMovimiento) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { productoId, datos } = (await req.json()) as { productoId: string; datos: DatosMovimiento };
  if (!productoId) return NextResponse.json({ ok: false, error: "productoId es obligatorio" }, { status: 400 });
  if (!["Entrada", "Salida", "Ajuste"].includes(datos.tipo)) {
    return NextResponse.json({ ok: false, error: "tipo debe ser Entrada, Salida o Ajuste" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<{
      ok: boolean;
      producto: Parameters<typeof mapearProducto>[0];
      movimiento: Parameters<typeof mapearMovimiento>[0];
    }>("/v1/inventario/movimientos", {
      requestId: crypto.randomUUID(),
      usuario,
      productoId,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      proveedor: datos.proveedor.trim(),
      numeroDocumento: datos.numeroDocumento.trim(),
      precioUnitario: datos.precioUnitario,
      total: datos.total,
      notas: datos.notas.trim(),
    });

    return NextResponse.json({
      ok: true,
      producto: mapearProducto(resultado.producto),
      movimiento: mapearMovimiento(resultado.movimiento),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
