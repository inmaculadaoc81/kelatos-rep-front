import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Reproduce apiPeekNumeroFactura('1') para reparaciones — previsualiza el
 * próximo número de la serie 1 sin reservarlo (dryRun: la reserva nunca se
 * confirma, se hace ROLLBACK en el backend).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  try {
    const requestId = crypto.randomUUID();
    const lineas = [{ descripcion: "peek", cantidad: 1, precio: 0 }];
    const resultado = await kelatosApiPost<{ ok: boolean; preview: { numeroFacturaTentativo: string } }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/facturas/preparar`,
      {
        requestId,
        usuario: session.user.email,
        tipo: "normal",
        payloadHash: crypto.createHash("sha256").update(requestId).digest("hex"),
        dryRun: true,
        datos: { lineas },
      }
    );
    return NextResponse.json({ ok: true, numero: resultado.preview.numeroFacturaTentativo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
