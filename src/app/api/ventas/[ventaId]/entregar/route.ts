import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/** Reproduce marcarVentaEntregadaUI() — solo se habilita cuando todas las
    piezas están recibidas; usa el PATCH genérico de cabecera de venta ya
    existente, no hace falta una ruta nueva en el backend. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ ventaId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { ventaId } = await params;
  try {
    await kelatosApiPost(
      `/v1/ventas/${encodeURIComponent(ventaId)}`,
      { requestId: crypto.randomUUID(), usuario, cambios: { estado: "Entregado", fecha_entrega: new Date().toISOString() } },
      "PATCH"
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
