import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearItem, DatosRegistrarPedido } from "@/lib/ventas";

/** Reproduce confirmarPedidoItem() — pasa el item a "En Tránsito". */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { itemId } = await params;
  const datos = (await req.json()) as DatosRegistrarPedido;
  if (!datos.proveedorId) return NextResponse.json({ ok: false, error: "Selecciona un proveedor" }, { status: 400 });
  if (!datos.numeroPedido?.trim()) return NextResponse.json({ ok: false, error: "El Nº de pedido es obligatorio" }, { status: 400 });
  if (!datos.fechaEstimada) return NextResponse.json({ ok: false, error: "La fecha estimada es obligatoria" }, { status: 400 });
  if (datos.fechaEstimada < new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ ok: false, error: "La fecha estimada no puede ser anterior a hoy" }, { status: 400 });
  }
  if (!datos.enlace?.trim()) return NextResponse.json({ ok: false, error: "El enlace es obligatorio" }, { status: 400 });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; item: Parameters<typeof mapearItem>[0] }>(
      `/v1/items-venta/${encodeURIComponent(itemId)}/registrar-pedido`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        proveedor_id: datos.proveedorId,
        numero_pedido: datos.numeroPedido.trim(),
        fecha_estimada: datos.fechaEstimada,
        enlace: datos.enlace.trim(),
      }
    );
    return NextResponse.json({ ok: true, item: mapearItem(resultado.item) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
