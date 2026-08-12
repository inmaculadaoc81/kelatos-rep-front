import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearVenta, DatosEditarVenta } from "@/lib/ventas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ventaId: string }> }
) {
  const { ventaId } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; venta: Parameters<typeof mapearVenta>[0]; items: Parameters<typeof mapearVenta>[1] }>(
      `/v1/lecturas/ventas/${encodeURIComponent(ventaId)}`
    );
    return NextResponse.json({ ok: true, venta: mapearVenta(resultado.venta, resultado.items) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ventaId: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { ventaId } = await params;
  const datos = (await req.json()) as DatosEditarVenta;

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; venta: Parameters<typeof mapearVenta>[0] }>(
      `/v1/ventas/${encodeURIComponent(ventaId)}`,
      {
        requestId: crypto.randomUUID(),
        usuario,
        cambios: {
          cliente_nombre: datos.clienteNombre.trim(),
          cliente_telefono: datos.clienteTelefono.trim(),
          cliente_email: datos.clienteEmail.trim(),
          observaciones: datos.observaciones.trim(),
          estado: datos.estado,
          estado_pago: datos.estadoPago,
        },
      },
      "PATCH"
    );

    return NextResponse.json({ ok: true, venta: mapearVenta(resultado.venta, []) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
