import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearFacturaRecibida } from "@/lib/facturas-recibidas";

const PARAMETROS = ["q", "proveedorId", "almacen", "estadoPago", "estadoRevision", "soloDuplicados", "desde", "hasta", "limit", "offset"];

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const params: Record<string, string> = {};
    for (const k of PARAMETROS) {
      const v = p.get(k);
      if (v) params[k] = v;
    }
    const data = await kelatosApiGet<{
      ok: boolean; total: number; pendientesRevision: number; posiblesDuplicados: number; pendientesPago: number;
      facturas: Parameters<typeof mapearFacturaRecibida>[0][];
    }>("/v1/facturas-recibidas", params);
    return NextResponse.json({
      ok: true, total: data.total, pendientesRevision: data.pendientesRevision, posiblesDuplicados: data.posiblesDuplicados,
      pendientesPago: data.pendientesPago, facturas: data.facturas.map(mapearFacturaRecibida),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const datos = await req.json();
  try {
    const data = await kelatosApiPost<{ ok: boolean; factura: Parameters<typeof mapearFacturaRecibida>[0] }>(
      "/v1/facturas-recibidas",
      { ...datos, usuario }
    );
    return NextResponse.json({ ok: true, factura: mapearFacturaRecibida(data.factura) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
