import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiPost } from "@/lib/kelatos-api";

const TIPOS = ["alquiler", "venta"];

/** Vincula una transferencia ya registrada (y su pareja conciliada) a un alquiler o a una venta. */
export async function POST(req: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { tipo, id } = await params;
  if (!TIPOS.includes(tipo)) return NextResponse.json({ ok: false, error: "Tipo no válido" }, { status: 400 });
  const body = (await req.json()) as { movimientoId?: unknown };
  try {
    await kelatosApiPost<{ ok: boolean }>(`/v1/comprobantes-transferencia/${tipo}/${encodeURIComponent(id)}/asociar`, { usuario, movimientoId: body.movimientoId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
