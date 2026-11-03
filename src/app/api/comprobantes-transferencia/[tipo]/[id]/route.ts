import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import type { ComprobanteTransferencia } from "@/app/(app)/reparaciones/comprobante-transferencia-boton";

const TIPOS = ["alquiler", "venta"];

/** Soporte de transferencia de un alquiler o de una venta de piezas: mismo pipeline (OCR + conciliación) que el de las reparaciones. */
export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { tipo, id } = await params;
  if (!TIPOS.includes(tipo)) return NextResponse.json({ ok: false, error: "Tipo no válido" }, { status: 400 });
  try {
    const r = await kelatosApiGet<{ ok: boolean; comprobante: ComprobanteTransferencia | null }>(`/v1/comprobantes-transferencia/${tipo}/${encodeURIComponent(id)}`);
    return NextResponse.json({ ok: true, comprobante: r.comprobante });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { tipo, id } = await params;
  if (!TIPOS.includes(tipo)) return NextResponse.json({ ok: false, error: "Tipo no válido" }, { status: 400 });
  const body = (await req.json()) as { base64?: string; mime?: string };
  if (!body.base64 || !body.mime) return NextResponse.json({ ok: false, error: "Falta el archivo del comprobante" }, { status: 400 });
  try {
    const r = await kelatosApiPost<{ ok: boolean; movimientoId: number; estado: string; ambiguo?: boolean; duplicado?: boolean; confianzaBaja?: boolean }>(
      `/v1/comprobantes-transferencia/${tipo}/${encodeURIComponent(id)}`,
      { usuario, base64: body.base64, mime: body.mime }
    );
    return NextResponse.json({ ok: true, movimientoId: r.movimientoId, estado: r.estado, ambiguo: !!r.ambiguo, duplicado: !!r.duplicado, confianzaBaja: !!r.confianzaBaja });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
