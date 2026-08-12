import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Orquesta el saga completo de envío de presupuestos (preparar-envio →
 * iniciar-envio → confirmar-envio) en una sola llamada — mismo patrón que
 * /api/reparaciones/[resguardo]/facturas/route.ts. El backend, no este
 * endpoint, decide qué presupuestos van (todos los "borrador" de la
 * reparación si no se especifican IDs) y genera/envía el email real
 * (canal "email") o solo marca el estado (canal "whatsapp" — sin
 * integración real conectada todavía).
 *
 * El requestId lo genera y conserva el CLIENTE, igual que el resto de
 * sagas de este proyecto, para que un reintento tras un fallo de red
 * reutilice la preparación ya hecha en vez de reservar números nuevos.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const body = (await req.json()) as { requestId: string; canal: "email" | "whatsapp"; modo?: string };
  const { requestId, canal, modo } = body;

  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ ok: false, error: "requestId inválido" }, { status: 400 });
  }
  if (canal !== "email" && canal !== "whatsapp") {
    return NextResponse.json({ ok: false, error: "canal debe ser 'email' o 'whatsapp'" }, { status: 400 });
  }

  try {
    await kelatosApiPost(`/v1/reparaciones/${encodeURIComponent(resguardo)}/presupuestos/preparar-envio`, {
      requestId, usuario, canal,
    });

    const iniciar = await kelatosApiPost<{ ok: boolean; estado: string }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/presupuestos/iniciar-envio`,
      { requestId, usuario, canal }
    );
    if (iniciar.estado === "resultado_desconocido") {
      return NextResponse.json({
        ok: false,
        error: "Un intento anterior quedó en un estado incierto. No se reintenta automáticamente — contacta con soporte para reconciliarlo manualmente."
      }, { status: 409 });
    }

    const confirmar = await kelatosApiPost<{
      ok: boolean;
      presupuestos: unknown[];
      reparacion: Record<string, unknown>;
    }>(`/v1/reparaciones/${encodeURIComponent(resguardo)}/presupuestos/confirmar-envio`, {
      requestId, usuario, canal, modo,
    });

    return NextResponse.json({ ok: true, presupuestos: confirmar.presupuestos, reparacion: confirmar.reparacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
