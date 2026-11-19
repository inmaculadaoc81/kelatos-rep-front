import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Reporte de ítems facturados: una fila por línea de factura/ticket con los datos del documento. Solo lectura. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  try {
    const resultado = await kelatosApiGet<Record<string, unknown>>("/v1/reporte-items-facturados", {
      desde: sp.get("desde") || undefined,
      hasta: sp.get("hasta") || undefined,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
