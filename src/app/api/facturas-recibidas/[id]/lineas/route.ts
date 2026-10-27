import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

export const dynamic = "force-dynamic";

/** Artículos (líneas) registrados de una factura recibida. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) return NextResponse.json({ ok: false, error: "Identificador no válido" }, { status: 400 });
  try {
    const data = await kelatosApiGet<{ ok: boolean; lineas: unknown[] }>(`/v1/facturas-recibidas/${id}/lineas`);
    return NextResponse.json({ ok: true, lineas: data.lineas || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502 });
  }
}
