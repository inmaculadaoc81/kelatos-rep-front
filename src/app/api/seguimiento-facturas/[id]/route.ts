import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";
import { mapearSeguimiento, DatosSeguimientoForm } from "@/lib/seguimiento-facturas";

function hashCanonico(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const datos = (await req.json()) as DatosSeguimientoForm;

  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, id, datos });

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; seguimiento: Parameters<typeof mapearSeguimiento>[0] }>(
      `/v1/seguimiento_facturas/${encodeURIComponent(id)}/editar`,
      {
        requestId,
        usuario,
        payloadHash,
        datos: {
          fecha: datos.fecha,
          plataforma: datos.plataforma.trim(),
          proveedor: datos.proveedor.trim(),
          numero_pedido: datos.numeroPedido.trim(),
          modelo: datos.modelo.trim(),
          importe: datos.importe,
          moneda: datos.moneda.trim() || "EUR",
          numero_factura: datos.numeroFactura.trim(),
          factura_recibida: datos.facturaRecibida,
          observaciones: datos.observaciones.trim(),
        },
      },
      "PATCH"
    );

    return NextResponse.json({ ok: true, entrada: mapearSeguimiento(resultado.seguimiento) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const requestId = crypto.randomUUID();
  const payloadHash = hashCanonico({ requestId, id, accion: "eliminar" });

  try {
    await kelatosApiPost(`/v1/seguimiento_facturas/${encodeURIComponent(id)}/eliminar`, { requestId, usuario, payloadHash });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
