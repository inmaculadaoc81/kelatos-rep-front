import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Reproduce apiPeekNumeroFactura('1') — solo previsualiza el próximo
 * número de la serie 1 sin reservarlo (dryRun: la reserva nunca se
 * confirma, se hace ROLLBACK). El requestId es de un solo uso, exigido
 * por la ruta pero descartado de inmediato.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const requestId = crypto.randomUUID();
    const lineas = [{ descripcion: "peek", cantidad: 1, precio: 0 }];
    const resultado = await kelatosApiPost<{ ok: boolean; preview: { numeroFacturaTentativo: string } }>("/v1/facturas/entidades/preparar", {
      requestId,
      usuario: session.user.email,
      tipo: "pedido",
      payloadHash: crypto.createHash("sha256").update(requestId).digest("hex"),
      dryRun: true,
      datos: { lineas },
    });
    return NextResponse.json({ ok: true, numero: resultado.preview.numeroFacturaTentativo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
