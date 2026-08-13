import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/**
 * Proxy de GET /v1/reparaciones/:resguardo/resguardo-html — el HTML de la
 * Hoja de Recepción con el mismo diseño que el original (obtenerHtmlResguardoParaImprimir,
 * FormularioCliente.js), para el botón "Imprimir resguardo".
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; html: string }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/resguardo-html`
    );
    return NextResponse.json({ ok: true, html: data.html });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
