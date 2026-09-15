import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";

export interface MovimientoConciliado {
  id: number;
  estado: "Pendiente" | "Conciliada";
  monto: string | null;
  fecha_valor: string | null;
  banco: string | null;
  remitente: string | null;
  concepto: string | null;
  origen: string;
  link_foto: string | null;
  fecha_registro: string;
}

export interface ComprobanteTransferencia {
  id: number;
  estado: "Pendiente" | "Conciliada";
  monto: string | null;
  fecha_valor: string | null;
  banco: string | null;
  remitente: string | null;
  link_foto: string | null;
  fecha_registro: string;
  fecha_conciliacion: string | null;
  par: MovimientoConciliado | null;
}

interface RespuestaSubida {
  ok: boolean;
  movimientoId: number;
  estado: "Pendiente" | "Conciliada";
  ambiguo?: boolean;
  duplicado?: boolean;
}

export async function GET(_req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  try {
    const resultado = await kelatosApiGet<{ ok: boolean; comprobante: ComprobanteTransferencia | null }>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/comprobante-transferencia`
    );
    return NextResponse.json({ ok: true, comprobante: resultado.comprobante });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/** Sube el comprobante de pago de la reparación — mismo pipeline de OCR +
    conciliación automática que ya usa el bot de Telegram de Transferencias
    (ver procesarComprobanteReparacion en el backend), solo que aquí queda
    vinculado al resguardo para poder consultar su estado desde aquí. */
export async function POST(req: Request, { params }: { params: Promise<{ resguardo: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { resguardo } = await params;
  const body = (await req.json()) as { base64?: string; mime?: string };
  if (!body.base64 || !body.mime) {
    return NextResponse.json({ ok: false, error: "Falta el archivo del comprobante" }, { status: 400 });
  }

  try {
    const resultado = await kelatosApiPost<RespuestaSubida>(
      `/v1/reparaciones/${encodeURIComponent(resguardo)}/comprobante-transferencia`,
      { usuario, base64: body.base64, mime: body.mime }
    );
    return NextResponse.json({
      ok: true,
      movimientoId: resultado.movimientoId,
      estado: resultado.estado,
      ambiguo: !!resultado.ambiguo,
      duplicado: !!resultado.duplicado,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
