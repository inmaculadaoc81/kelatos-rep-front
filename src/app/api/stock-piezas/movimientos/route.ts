import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** Movimientos de stock (salidas por facturación, ventas, entradas por compra, ajustes manuales). Solo lectura. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  try {
    const resultado = await kelatosApiGet<Record<string, unknown>>("/v1/stock-piezas-movimientos", {
      desde: sp.get("desde") || undefined,
      hasta: sp.get("hasta") || undefined,
      tipo: sp.get("tipo") || undefined,
      q: sp.get("q") || undefined,
      limit: sp.get("limit") || undefined,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
