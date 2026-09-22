import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet, kelatosApiPost } from "@/lib/kelatos-api";
import { mapearFacturaRecibida } from "@/lib/facturas-recibidas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await kelatosApiGet<{ ok: boolean; factura: Parameters<typeof mapearFacturaRecibida>[0] }>(`/v1/facturas-recibidas/${id}`);
    return NextResponse.json({ ok: true, factura: mapearFacturaRecibida(data.factura) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const usuario = session?.user?.email;
  if (!usuario) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const datos = await req.json();
  try {
    const data = await kelatosApiPost<{ ok: boolean; factura: Parameters<typeof mapearFacturaRecibida>[0] }>(
      `/v1/facturas-recibidas/${id}`,
      { ...datos, usuario },
      "PATCH"
    );
    return NextResponse.json({ ok: true, factura: mapearFacturaRecibida(data.factura) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
