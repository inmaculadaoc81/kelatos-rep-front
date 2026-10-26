import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kelatosApiGet } from "@/lib/kelatos-api";

/** ¿Existe este número de factura en el sistema? (para vincularlo a la venta de un equipo) */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const numero = new URL(req.url).searchParams.get("numero")?.trim() ?? "";
  if (!numero) return NextResponse.json({ ok: false, error: "Indica el número de factura" }, { status: 400 });
  try {
    return NextResponse.json(await kelatosApiGet<object>(`/v1/equipos/factura-venta/buscar?numero=${encodeURIComponent(numero)}`));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 400 });
  }
}
