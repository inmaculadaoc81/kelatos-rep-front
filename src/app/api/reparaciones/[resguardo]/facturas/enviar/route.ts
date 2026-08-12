import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

/**
 * Botón "Enviar al cliente" / "Enviar a otro correo" del modal de
 * Facturas de Clientes — proxy directo a POST .../facturas/enviar
 * (kelatos-rep-back), que descarga el PDF real de Drive y lo adjunta.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ resguardo: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const body = (await req.json()) as { tipo: string; emailDestino?: string };

  try {
    const resultado = await kelatosApiPost<{ ok: boolean; enviado: boolean; motivo?: string }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/facturas/enviar`,
      { tipo: body.tipo, emailDestino: body.emailDestino || "" }
    );
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
